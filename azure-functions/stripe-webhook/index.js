const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { upsertSubscription, upsertReceipt, getUser } = require('../lib/table');
const emailService = require('../utils/email'); // Ensure this points to your email service
const receiptGenerator = require('../utils/receipt'); // Ensure this points to your receipt generator
const { format } = require('date-fns');

module.exports = async function (context, req) {
    context.log('Stripe Webhook processed a request.');

    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        context.log.error(`Webhook Error: ${err.message}`);
        context.res = { status: 400, body: `Webhook Error: ${err.message}` };
        return;
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                context.log('[Webhook] Processing checkout.session.completed');
                const session = event.data.object;
                const email = session.customer_details.email || session.metadata?.email;
                const name = session.customer_details.name || email.split('@')[0];

                if (!email) {
                    context.log.error('[Webhook] No email found in session');
                    break;
                }

                // Get subscription details if exists
                let subscriptionStatus = 'active';
                let currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                let createdDate = format(new Date(), 'yyyy-MM-dd');
                let trialEnd = null;
                let trialEndTimestamp = null; // ISO 8601形式で保存

                if (session.subscription) {
                    const subscription = await stripe.subscriptions.retrieve(session.subscription);
                    subscriptionStatus = subscription.status; // trialing, active, etc.
                    currentPeriodEnd = new Date(subscription.current_period_end * 1000);
                    // Use subscription start date for consistent trial calculations
                    createdDate = format(new Date(subscription.created * 1000), 'yyyy-MM-dd');
                    if (subscription.trial_end) {
                        trialEndTimestamp = new Date(subscription.trial_end * 1000).toISOString();
                        trialEnd = format(new Date(subscription.trial_end * 1000), 'yyyy-MM-dd');
                    }
                }

                // If trial end is not set but we have a calculated currentPeriodEnd (e.g. for trial duration)
                if (!trialEnd && subscriptionStatus === 'trialing') {
                    trialEndTimestamp = currentPeriodEnd.toISOString();
                    trialEnd = format(currentPeriodEnd, 'yyyy-MM-dd');
                }

                context.log(`[Webhook] Upserting subscription for ${email}, Status: ${subscriptionStatus}, TrialEnd: ${trialEnd || 'N/A'}`);

                await upsertSubscription(email, {
                    status: subscriptionStatus,
                    stripeCustomerId: session.customer,
                    stripeSubscriptionId: session.subscription,
                    currentPeriodEnd: currentPeriodEnd.toISOString(),
                    trialEnd: trialEndTimestamp, // Stripeのtrial_endを保存
                    canceledAt: null,
                    cancelAtPeriodEnd: false,
                    createdDate: createdDate // Save YYYY-MM-DD for trial warning query
                });

                const jwt = require('jsonwebtoken');
                const secret = process.env.JWT_SECRET;
                // Generate long-lived session token (1 year) for the welcome email
                // This allows users to start using the extension immediately without re-login
                const sessionToken = jwt.sign({ email, type: 'session' }, secret, { expiresIn: '365d' });

                // Send Welcome Email
                try {
                    context.log('[Webhook] Sending welcome email...');
                    // trialEndがnullの場合はemailServiceで適切なメッセージを表示
                    await emailService.sendWelcomeEmail(email, name, trialEnd, sessionToken);
                    context.log('[Webhook] Welcome email sent.');
                } catch (e) {
                    context.log.error(`[Webhook] Failed to send welcome email to ${email}:`, e);
                }

                context.log(`[Webhook] Subscription created flow complete: ${email} - ${subscriptionStatus}`);
                break;
            }
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const customerId = subscription.customer;
                const customer = await stripe.customers.retrieve(customerId);
                const email = customer.email;

                if (!email) {
                    context.log.error('[Webhook] No email found for customer:', customerId);
                    break;
                }

                // Check for status change: trialing -> active
                const previousAttributes = event.data.previous_attributes;
                if (previousAttributes && previousAttributes.status === 'trialing' && subscription.status === 'active') {
                    context.log(`[Webhook] Trial ended for ${email}, sending notification.`);
                    try {
                        const name = customer.name || email.split('@')[0];
                        const amount = subscription.plan.amount; // Ensure plan amount is available
                        const nextBillingDate = format(new Date(subscription.current_period_end * 1000), 'yyyy-MM-dd');

                        await emailService.sendTrialEndEmail(email, name, amount, nextBillingDate);
                    } catch (e) {
                        context.log.error(`[Webhook] Failed to send trial end email to ${email}:`, e);
                    }
                }

                // Check for cancellation scheduled: cancel_at_period_end changed to true
                // Relaxed condition: If it's true, we consider sending email. 
                // To avoid multiple emails, we could check if we already processed it, but for now getting the email sent is priority.
                // We can check if the DB already has cancelAtPeriodEnd=true to avoid duplicate, but stripe-webhook gets current state.

                const isCancellationScheduled = subscription.cancel_at_period_end === true;
                const wasNotScheduled = previousAttributes && previousAttributes.cancel_at_period_end === false;

                // Send email if explicitly changed, OR if it's true and we suspect we missed it (fallback)
                // For this specific user case, simpler is better.
                if (isCancellationScheduled && (wasNotScheduled || !previousAttributes)) {
                    context.log(`[Webhook] Cancellation scheduled for ${email}.`);
                    try {
                        const name = customer.name || email.split('@')[0];
                        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
                        const accessEndDate = format(currentPeriodEnd, 'yyyy-MM-dd');

                        await emailService.sendCancellationEmail(email, name, accessEndDate);
                        context.log(`[Webhook] Cancellation email sent to ${email}`);
                    } catch (e) {
                        context.log.error(`[Webhook] Failed to send cancellation email to ${email}:`, e);
                    }
                }

                const updateData = {
                    status: subscription.status,
                    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
                    cancelAtPeriodEnd: subscription.cancel_at_period_end || false
                };

                // trial_endが設定されている場合は保存
                if (subscription.trial_end) {
                    updateData.trialEnd = new Date(subscription.trial_end * 1000).toISOString();
                }

                // キャンセルされた場合
                if (subscription.canceled_at) {
                    updateData.canceledAt = new Date(subscription.canceled_at * 1000).toISOString();
                }

                await upsertSubscription(email, updateData);
                context.log(`[Webhook] Subscription updated: ${email} - ${subscription.status}`);
                break;
            }
            case 'customer.subscription.deleted': {
                context.log('[Webhook] Processing customer.subscription.deleted');
                const subscription = event.data.object;
                const customerId = subscription.customer;
                const customer = await stripe.customers.retrieve(customerId);
                const email = customer.email;
                const name = customer.name || email.split('@')[0];

                if (!email) {
                    context.log.error('[Webhook] No email found for customer:', customerId);
                    break;
                }

                const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
                const accessEndDate = format(currentPeriodEnd, 'yyyy-MM-dd');

                context.log(`[Webhook] Subscription deleted for ${email}. Access ends: ${accessEndDate}`);

                await upsertSubscription(email, {
                    status: 'canceled',
                    currentPeriodEnd: currentPeriodEnd.toISOString(),
                    canceledAt: new Date(subscription.canceled_at * 1000).toISOString(),
                    cancelAtPeriodEnd: false
                });
                context.log('[Webhook] Subscription record updated to canceled.');

                // Send Cancellation Email
                try {
                    context.log(`[Webhook] Sending cancellation email to ${email}...`);
                    await emailService.sendCancellationEmail(email, name, accessEndDate);
                    context.log(`[Webhook] Cancellation email sent successfully to ${email}`);
                } catch (e) {
                    context.log.error(`[Webhook] Failed to send cancellation email to ${email}:`, e);
                }

                context.log(`[Webhook] Subscription deleted flow complete for: ${email}`);
                break;
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const customerEmail = invoice.customer_email || invoice.customer_name;
                const hostedInvoiceUrl = invoice.hosted_invoice_url; // Link to pay the invoice

                if (!customerEmail) {
                    context.log.error(`[Webhook] No email found for failed invoice: ${invoice.id}`);
                    break;
                }

                context.log(`[Webhook] Payment failed for invoice: ${invoice.id}, email: ${customerEmail}`);

                // Update subscription status if needed (though Stripe retries might keep it active)
                // We rely on 'customer.subscription.updated' to handle status changes to 'past_due' etc.

                // Send Payment Failed Email
                try {
                    // Try to get a portal URL for updating card
                    let portalUrl = null;
                    // We can't generate it here easily without adding more logic, so we let emailService generate it
                    // or pass hosted_invoice_url as a fallback

                    const failureReason = invoice.last_payment_error ? invoice.last_payment_error.message : '決済処理に失敗しました。';

                    // Retrieve customer name if possible
                    let customerName = invoice.customer_name;
                    if (!customerName && invoice.customer) {
                        try {
                            const customer = await stripe.customers.retrieve(invoice.customer);
                            customerName = customer.name;
                        } catch (e) {
                            // ignore
                        }
                    }

                    await emailService.sendPaymentFailedEmail(customerEmail, customerName, failureReason, null);

                } catch (e) {
                    context.log.error(`[Webhook] Failed to send payment failed email to ${customerEmail}:`, e);
                }
                break;
            }
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                const customerEmail = invoice.customer_email || invoice.customer_name; // Fallback

                // Ensure we have an email
                if (!customerEmail) {
                    context.log.error(`[Webhook] No email found for invoice: ${invoice.id}`);
                    break;
                }

                if (invoice.amount_paid === 0) {
                    context.log(`[Webhook] Invoice ${invoice.id} amount is 0, skipping receipt.`);
                    break;
                }

                context.log(`[Webhook] Processing receipt for invoice: ${invoice.id}`);

                try {
                    const amount = invoice.amount_paid; // Amount in smallest currency unit (e.g., yen)
                    const currency = invoice.currency;
                    const billingDate = format(new Date(invoice.created * 1000), 'yyyy-MM');
                    const receiptNumber = receiptGenerator.generateReceiptNumber(new Date());

                    // Get customer information from Users table
                    const userInfo = await getUser(customerEmail);

                    // Generate PDF
                    const buffer = await receiptGenerator.generateReceipt({
                        receiptNumber,
                        customerName: userInfo?.name || invoice.customer_name || customerEmail.split('@')[0],
                        customerEmail: customerEmail,
                        customerAddress: userInfo?.address,
                        customerPhone: userInfo?.phone,
                        facilityName: userInfo?.facilityName,
                        amount: amount,
                        billingDate: billingDate,
                        issueDate: new Date()
                    });

                    // Send Email
                    await emailService.sendReceiptEmail(
                        customerEmail,
                        invoice.customer_name,
                        buffer,
                        receiptNumber,
                        amount,
                        billingDate
                    );

                    // Record Receipt
                    await upsertReceipt({
                        receiptNumber,
                        email: customerEmail,
                        amount,
                        billingDate,
                        stripeInvoiceId: invoice.id,
                        sentAt: new Date().toISOString()
                    });

                    context.log(`[Webhook] Receipt sent for ${customerEmail}`);

                } catch (receiptError) {
                    context.log.error(`[Webhook] Failed to process receipt for ${invoice.id}:`, receiptError);
                }
                break;
            }
            default:
                context.log(`[Webhook] Unhandled event type: ${event.type}`);
        }

        context.res = { body: { received: true } };
    } catch (error) {
        context.log.error("Error processing webhook:", error);
        context.res = { status: 500, body: { error: error.message } };
    }
}
