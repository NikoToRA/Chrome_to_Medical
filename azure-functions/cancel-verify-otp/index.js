const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { getUser, upsertUser, getSubscription } = require('../lib/table');

module.exports = async function (context, req) {
    const { email, otp } = req.body;

    if (!email || !otp) {
        context.res = { status: 400, body: "Email and OTP required" };
        return;
    }

    try {
        const user = await getUser(email);
        if (!user || user.cancellationOtp !== otp) {
            context.res = { status: 400, body: "Invalid OTP" };
            return;
        }

        if (new Date(user.cancellationOtpExpires) < new Date()) {
            context.res = { status: 400, body: "OTP expired" };
            return;
        }

        // Get Subscription ID
        const sub = await getSubscription(email);
        if (!sub || !sub.stripeCustomerId) {
            context.res = { status: 400, body: "No active subscription found" };
            return;
        }

        // Find active subscription for customer
        const subscriptions = await stripe.subscriptions.list({
            customer: sub.stripeCustomerId,
            status: 'active',
            limit: 1
        });

        // Also check trialing
        const trialing = await stripe.subscriptions.list({
            customer: sub.stripeCustomerId,
            status: 'trialing',
            limit: 1
        });

        const subscription = subscriptions.data[0] || trialing.data[0];

        if (subscription) {
            await stripe.subscriptions.cancel(subscription.id);
            await upsertUser(email, { cancellationOtp: null }); // Clear OTP
            context.res = { body: { message: "Subscription canceled" } };
        } else {
            context.res = { status: 404, body: "No active subscription found on Stripe" };
        }

    } catch (error) {
        context.log.error(error);
        context.res = { status: 500, body: "Internal Server Error" };
    }
};
