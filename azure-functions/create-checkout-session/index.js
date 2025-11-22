const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function (context, req) {
    context.log('Create Checkout Session processed a request.');

    if (req.method === 'OPTIONS') {
        context.res = { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } };
        return;
    }

    const { email, returnUrl } = req.body;

    if (!email) {
        context.res = { status: 400, body: "Email is required" };
        return;
    }

    try {
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
