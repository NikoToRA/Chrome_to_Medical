const Stripe = require('stripe');
const { getSubscription } = require('../lib/table');

const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

module.exports = async function (context, req) {
    // CORS handling
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        };
        return;
    }

    const { email } = req.body || {};

    if (!email) {
        context.res = {
            status: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: { error: "Email is required" }
        };
        return;
    }

    if (!stripe) {
        context.res = {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: { error: "Stripe not configured" }
        };
        return;
    }

    try {
        // Get user's Stripe customer ID from database
        const subscription = await getSubscription(email);

        if (!subscription || !subscription.stripeCustomerId) {
            context.res = {
                status: 404,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: { error: "No subscription found for this email" }
            };
            return;
        }

        // Create Stripe Customer Portal session
        const session = await stripe.billingPortal.sessions.create({
            customer: subscription.stripeCustomerId,
            return_url: process.env.LANDING_PAGE_URL || 'https://stkarteai1763705952.z11.web.core.windows.net'
        });

        context.log('[CreatePortalSession] Created portal session for:', email);

        context.res = {
            status: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: { url: session.url }
        };
    } catch (error) {
        context.log.error('[CreatePortalSession] Error:', error);
        context.res = {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: { error: error.message }
        };
    }
};
