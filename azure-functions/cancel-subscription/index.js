const Stripe = require('stripe');
const jwt = require('jsonwebtoken');
const { getSubscription, upsertSubscription } = require('../lib/table');

const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async function (context, req) {
    context.log('Cancel Subscription processed a request.');

    // CORS handling
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        };
        return;
    }

    // 1. Validate JWT Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        context.res = {
            status: 401,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: { error: "Unauthorized: Missing or invalid token" }
        };
        return;
    }

    const token = authHeader.split(' ')[1];
    let userEmail = null;

    try {
        if (!JWT_SECRET) {
            throw new Error("Server misconfiguration: JWT_SECRET missing");
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        userEmail = decoded.email || decoded.sub; // Support both standard claims
    } catch (err) {
        context.log.error('[CancelSubscription] Token verification failed:', err.message);
        context.res = {
            status: 401,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: { error: "Unauthorized: Invalid token" }
        };
        return;
    }

    if (!userEmail) {
        context.res = {
            status: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: { error: "Invalid token: Email claim missing" }
        };
        return;
    }

    // 2. Check Stripe Configuration
    if (!stripe) {
        context.res = {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: { error: "Stripe not configured" }
        };
        return;
    }

    try {
        // 3. Get subscription from provided email (from Verified Token)
        const subscription = await getSubscription(userEmail);

        if (!subscription || !subscription.subscriptionId) {
            context.res = {
                status: 404,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: { error: "Active subscription not found" }
            };
            return;
        }

        // 4. Cancel Stripe Subscription immediately
        const canceledSubscription = await stripe.subscriptions.cancel(
            subscription.subscriptionId
        );

        context.log('[CancelSubscription] Stripe subscription cancelled:', canceledSubscription.id);

        // 5. Update Subscription in DB
        await upsertSubscription(userEmail, {
            status: 'canceled',
            canceledAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        context.res = {
            status: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: {
                success: true,
                message: "Subscription cancelled successfully",
                status: 'canceled'
            }
        };

    } catch (error) {
        context.log.error('[CancelSubscription] Error:', error);

        // Handle Stripe specific errors
        let errorMessage = error.message;
        if (error.type === 'StripeInvalidRequestError') {
            errorMessage = "Subscription issue: " + error.message;
        }

        context.res = {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: { error: errorMessage }
        };
    }
};
