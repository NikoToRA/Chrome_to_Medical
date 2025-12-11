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

    try {
        // Lazy load dependencies to catch initialization errors
        let Stripe, jwt, getSubscription, upsertSubscription, stripe;

        try {
            jwt = require('jsonwebtoken');
        } catch (e) { throw new Error(`Failed to load jsonwebtoken: ${e.message}`); }

        try {
            Stripe = require('stripe');
        } catch (e) { throw new Error(`Failed to load stripe: ${e.message}`); }

        try {
            const table = require('../lib/table');
            getSubscription = table.getSubscription;
            upsertSubscription = table.upsertSubscription;
        } catch (e) { throw new Error(`Failed to load lib/table: ${e.message}`); }

        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) throw new Error("Server misconfiguration: JWT_SECRET missing");

        stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;
        if (!stripe) throw new Error("Server misconfiguration: STRIPE_SECRET_KEY missing or Stripe init failed");


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
            const decoded = jwt.verify(token, JWT_SECRET);
            userEmail = decoded.email || decoded.sub;
        } catch (err) {
            context.log.error('[CancelSubscription] Token verification failed:', err.message);
            context.res = {
                status: 401,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: {
                    error: "Unauthorized: Invalid token",
                    details: err.message, // Leak internal error for debugging
                    secretLength: JWT_SECRET ? JWT_SECRET.length : 0
                }
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

        // 3. Get subscription
        const subscription = await getSubscription(userEmail);

        if (!subscription || !subscription.subscriptionId) {
            // Check if already canceled in our DB?
            if (subscription && subscription.status === 'canceled') {
                context.res = {
                    status: 200,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: { success: true, message: "Already canceled", status: 'canceled' }
                };
                return;
            }

            context.res = {
                status: 404,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: { error: "Active subscription not found" }
            };
            return;
        }

        // 4. Cancel Stripe Subscription
        try {
            const canceledSubscription = await stripe.subscriptions.cancel(subscription.subscriptionId);
            context.log('[CancelSubscription] Stripe subscription cancelled:', canceledSubscription.id);
        } catch (stripeErr) {
            // ignore if already canceled
            if (stripeErr.code === 'resource_missing') {
                context.log.warn('Stripe subscription already missing:', subscription.subscriptionId);
            } else {
                throw stripeErr;
            }
        }

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
        context.log.error('[CancelSubscription] Request Failed:', error);
        context.res = {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: {
                error: "Internal Server Error",
                details: error.message,
                stack: error.stack
            }
        };
    }
};

