const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { requireAuth } = require('../lib/auth');

module.exports = async function (context, req) {
    context.log('Create Checkout Session processed a request.');

    if (req.method === 'OPTIONS') {
        context.res = { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } };
        return;
    }

    const { email, returnUrl } = req.body || {};

    if (!email) {
        context.res = { status: 400, body: "Email is required" };
        return;
    }

    try {
        // If Authorization provided, ensure email matches the authenticated identity
        try {
            const { email: authEmail } = await requireAuth(context, req);
            if (email && email.toLowerCase() !== authEmail.toLowerCase()) {
                context.res = { status: 403, body: "Email mismatch" };
                return;
            }
        } catch (_) {
            // no auth header: allow as long as email is provided
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: email,
            line_items: [
                {
                    // Replace with your actual Price ID from Stripe Dashboard
                    price: process.env.STRIPE_PRICE_ID,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            subscription_data: {
                trial_period_days: 14,
                metadata: {
                    email: email // Store email in subscription metadata too
                }
            },
            success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: returnUrl,
        });

        context.res = {
            body: { url: session.url }
        };
    } catch (error) {
        context.log.error("Error creating checkout session:", error);
        context.res = { status: 500, body: { error: error.message } };
    }
}
