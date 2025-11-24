const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { 
    upsertSubscription, 
    upsertStripeSubscription,
    upsertStripeCustomer,
    insertPaymentHistory
} = require('../lib/table');

module.exports = async function (context, req) {
    context.log('Stripe Webhook processed a request.', { type: req.body?.type });

    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
        context.log('Webhook verified successfully', { type: event.type });
    } catch (err) {
        context.log.error(`Webhook Error: ${err.message}`);
        context.res = { status: 400, body: `Webhook Error: ${err.message}` };
        return;
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const email = session.customer_details?.email;
                const customerId = session.customer;
                const subscriptionId = session.subscription;

                context.log('Processing checkout.session.completed', { 
                    email, 
                    customerId, 
                    subscriptionId 
                });

                if (!email) {
                    context.log.warn('No email in checkout session');
                    break;
                }

                // サブスクリプション情報を取得
                let subscriptionData = {};
                if (subscriptionId) {
                    try {
                        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                        subscriptionData = {
                            subscriptionId: subscription.id,
                            status: subscription.status,
                            currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
                            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
                            cancelAtPeriodEnd: subscription.cancel_at_period_end,
                            planId: subscription.items.data[0]?.price?.id,
                            planName: subscription.items.data[0]?.price?.nickname || subscription.items.data[0]?.price?.product,
                            amount: subscription.items.data[0]?.price?.unit_amount,
                            currency: subscription.items.data[0]?.price?.currency,
                            trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
                        };

                        // Stripeサブスクリプション情報を詳細に保存
                        await upsertStripeSubscription(subscriptionId, {
                            ...subscriptionData,
                            customerId: customerId,
                            email: email,
                        });
                    } catch (err) {
                        context.log.error('Error retrieving subscription:', err);
                    }
                }

                // 顧客情報を保存
                if (customerId) {
                    try {
                        const customer = await stripe.customers.retrieve(customerId);
                        await upsertStripeCustomer(customerId, {
                            email: customer.email,
                            name: customer.name,
                            created: new Date(customer.created * 1000).toISOString(),
                            metadata: customer.metadata,
                        });
                    } catch (err) {
                        context.log.error('Error retrieving customer:', err);
                    }
                }

                // サブスクリプション状態を保存（emailベース）
                await upsertSubscription(email, {
                    status: subscriptionData.status || 'active',
                    stripeCustomerId: customerId,
                    stripeSubscriptionId: subscriptionId,
                    currentPeriodEnd: subscriptionData.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    planId: subscriptionData.planId,
                    planName: subscriptionData.planName,
                });

                break;
            }

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const customerId = subscription.customer;
                const subscriptionId = subscription.id;

                context.log(`Processing ${event.type}`, { 
                    subscriptionId, 
                    customerId, 
                    status: subscription.status 
                });

                // 顧客情報を取得
                let email = null;
                try {
                    const customer = await stripe.customers.retrieve(customerId);
                    email = customer.email;

                    // 顧客情報を更新
                    await upsertStripeCustomer(customerId, {
                        email: customer.email,
                        name: customer.name,
                        metadata: customer.metadata,
                    });
                } catch (err) {
                    context.log.error('Error retrieving customer:', err);
                }

                // サブスクリプション情報を詳細に保存
                const subscriptionData = {
                    subscriptionId: subscription.id,
                    status: subscription.status,
                    currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
                    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
                    planId: subscription.items.data[0]?.price?.id,
                    planName: subscription.items.data[0]?.price?.nickname || subscription.items.data[0]?.price?.product,
                    amount: subscription.items.data[0]?.price?.unit_amount,
                    currency: subscription.items.data[0]?.price?.currency,
                    customerId: customerId,
                    email: email,
                };

                await upsertStripeSubscription(subscriptionId, subscriptionData);

                // emailベースのサブスクリプション状態を更新
                if (email) {
                    await upsertSubscription(email, {
                        status: subscription.status,
                        stripeCustomerId: customerId,
                        stripeSubscriptionId: subscriptionId,
                        currentPeriodEnd: subscriptionData.currentPeriodEnd,
                        planId: subscriptionData.planId,
                        planName: subscriptionData.planName,
                        cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    });
                }

                break;
            }

            case 'payment_intent.succeeded':
            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                const customerId = paymentIntent.customer;

                context.log(`Processing ${event.type}`, { 
                    paymentIntentId: paymentIntent.id,
                    customerId,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency
                });

                // 顧客情報を取得
                let email = null;
                if (customerId) {
                    try {
                        const customer = await stripe.customers.retrieve(customerId);
                        email = customer.email;
                    } catch (err) {
                        context.log.error('Error retrieving customer:', err);
                    }
                }

                // 決済履歴を保存
                await insertPaymentHistory(paymentIntent.id, {
                    customerId: customerId,
                    email: email,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                    status: paymentIntent.status,
                    paymentMethod: paymentIntent.payment_method,
                    createdAt: new Date(paymentIntent.created * 1000).toISOString(),
                });

                break;
            }

            case 'invoice.payment_succeeded':
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const customerId = invoice.customer;
                const subscriptionId = invoice.subscription;

                context.log(`Processing ${event.type}`, { 
                    invoiceId: invoice.id,
                    customerId,
                    subscriptionId,
                    amount: invoice.amount_paid || invoice.amount_due
                });

                // Optional: Email receipt/notice via ACS/SendGrid if configured
                try {
                    const { sendEmail } = require('../lib/email');
                    const { buildReceiptEmail } = require('../lib/receipt');
                    let email = invoice.customer_email || null;
                    if (!email && customerId) {
                        try {
                            const customer = await stripe.customers.retrieve(customerId);
                            email = customer.email;
                        } catch (_) {}
                    }
                    if (email && (process.env.EMAIL_SEND_RECEIPTS === 'true')) {
                        let subject, text, html;
                        if (event.type === 'invoice.payment_succeeded') {
                            const payload = buildReceiptEmail(invoice);
                            subject = payload.subject; text = payload.text; html = payload.html;
                        } else {
                            subject = 'お支払いに失敗しました（Karte AI+）';
                            const amount = ((invoice.amount_due || 0)/100) + ' ' + (invoice.currency || 'jpy').toUpperCase();
                            text = `お支払いに失敗しました。金額: ${amount}\nご利用を継続するにはお支払い方法の更新が必要です。`;
                            html = `<p>お支払いに失敗しました。ご利用を継続するにはお支払い方法の更新が必要です。</p><p>金額: <b>${amount}</b></p>`;
                        }
                        try {
                            await sendEmail({ to: email, subject, text, html });
                            context.log(`Receipt/notice email sent to ${email}`);
                        } catch (e) {
                            try {
                                const sgKey = process.env.SENDGRID_API_KEY;
                                if (sgKey) {
                                    const sg = require('@sendgrid/mail');
                                    sg.setApiKey(sgKey);
                                    await sg.send({ to: email, from: 'no-reply@karte-ai-plus.com', subject, text, html });
                                    context.log(`Receipt/notice email (fallback) sent to ${email}`);
                                }
                            } catch (_) {}
                        }
                    }
                } catch (e) {
                    context.log('Receipt email send skipped or failed:', e.message);
                }

                break;
            }

            default:
                context.log(`Unhandled event type: ${event.type}`);
        }

        context.res = { body: { received: true, eventType: event.type } };
    } catch (error) {
        context.log.error("Error processing webhook:", error);
        context.res = { status: 500, body: { error: error.message } };
    }
}
