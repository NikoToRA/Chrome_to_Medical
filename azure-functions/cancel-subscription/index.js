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
                    error: "認証エラー",
                    message: "トークンが無効または期限切れです。再度ログインしてください。"
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
        context.log('[CancelSubscription] Retrieved subscription for', userEmail, ':', JSON.stringify(subscription));

        const subId = subscription ? (subscription.stripeSubscriptionId || subscription.subscriptionId) : null;
        context.log('[CancelSubscription] Resolved subId:', subId);

        if (!subscription || !subId) {
            context.log.warn('[CancelSubscription] Active subscription not found. Subscription object:', subscription, 'Resolved subId:', subId);

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
                body: {
                    error: "Active subscription not found",
                    debug: {
                        email: userEmail,
                        hasSubscription: !!subscription,
                        hasSubId: !!subId,
                        subscriptionKeys: subscription ? Object.keys(subscription) : []
                    }
                }
            };
            return;
        }

        // 4. Update Stripe Subscription to cancel at period end
        let canceledSubscription;
        try {
            canceledSubscription = await stripe.subscriptions.update(subId, {
                cancel_at_period_end: true
            });
            context.log('[CancelSubscription] Stripe subscription set to cancel at period end:', canceledSubscription.id);
        } catch (stripeErr) {
            // ignore if already canceled
            if (stripeErr.code === 'resource_missing') {
                context.log.warn('Stripe subscription already missing:', subId);
                // If it's missing, we might want to treat it as canceled locally
                canceledSubscription = { status: 'canceled', cancel_at_period_end: true }; // Dummy object for DB update
            } else {
                throw stripeErr;
            }
        }

        // 5. Update Subscription in DB
        // We do NOT set status to 'canceled' yet. It remains 'active' (or whatever it was) until the period ends.
        // We just verify the cancelAtPeriodEnd flag.
        await upsertSubscription(userEmail, {
            // status: 'canceled', // Don't change status yet
            cancelAtPeriodEnd: true,
            updatedAt: new Date().toISOString()
        });

        context.res = {
            status: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: {
                success: true,
                message: "Subscription cancellation scheduled",
                status: canceledSubscription.status,
                cancelAtPeriodEnd: true,
                currentPeriodEnd: canceledSubscription.current_period_end
                    ? new Date(canceledSubscription.current_period_end * 1000).toISOString()
                    : null
            }
        };

    } catch (error) {
        context.log.error('[CancelSubscription] Request Failed:', error);
        context.res = {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: {
                error: "サーバーエラー",
                message: "解約処理中にエラーが発生しました。しばらく時間をおいてから再度お試しください。"
            }
        };
    }
};

