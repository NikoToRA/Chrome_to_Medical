const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { upsertSubscription } = require('../lib/table');

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
                const session = event.data.object;
                const email = session.customer_details.email || session.metadata?.email;

                if (!email) {
                    context.log.error('[Webhook] No email found in session');
                    break;
                }

                // Get subscription details if exists
                let subscriptionStatus = 'active';
                let currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                if (session.subscription) {
                    const subscription = await stripe.subscriptions.retrieve(session.subscription);
                    subscriptionStatus = subscription.status; // trialing, active, etc.
                    currentPeriodEnd = new Date(subscription.current_period_end * 1000);
                }

                await upsertSubscription(email, {
                    status: subscriptionStatus,
                    stripeCustomerId: session.customer,
                    stripeSubscriptionId: session.subscription,
                    currentPeriodEnd: currentPeriodEnd.toISOString(),
                    canceledAt: null,
                    cancelAtPeriodEnd: false
                });

                context.log(`[Webhook] Subscription created: ${email} - ${subscriptionStatus}`);
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

                const updateData = {
                    status: subscription.status,
                    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
                    cancelAtPeriodEnd: subscription.cancel_at_period_end || false
                };

                // キャンセルされた場合
                if (subscription.canceled_at) {
                    updateData.canceledAt = new Date(subscription.canceled_at * 1000).toISOString();
                }

                await upsertSubscription(email, updateData);
                context.log(`[Webhook] Subscription updated: ${email} - ${subscription.status}`);
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const customerId = subscription.customer;
                const customer = await stripe.customers.retrieve(customerId);
                const email = customer.email;

                if (!email) {
                    context.log.error('[Webhook] No email found for customer:', customerId);
                    break;
                }

                await upsertSubscription(email, {
                    status: 'canceled',
                    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
                    canceledAt: new Date(subscription.canceled_at * 1000).toISOString(),
                    cancelAtPeriodEnd: false
                });

                context.log(`[Webhook] Subscription deleted: ${email}`);
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
