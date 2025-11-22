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
                const email = session.customer_details.email;
                // Update DB
                await upsertSubscription(email, {
                    status: 'active',
                    stripeCustomerId: session.customer,
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Approx, better to use subscription object
                });
                break;
            }
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const customerId = subscription.customer;
                // We need to find the email associated with this customer. 
                // Ideally we stored it, or we fetch from Stripe.
                const customer = await stripe.customers.retrieve(customerId);
                const email = customer.email;

                await upsertSubscription(email, {
                    status: subscription.status,
                    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
                });
                break;
            }
            default:
                context.log(`Unhandled event type ${event.type}`);
        }

        context.res = { body: { received: true } };
    } catch (error) {
        context.log.error("Error processing webhook:", error);
        context.res = { status: 500, body: { error: error.message } };
    }
}
