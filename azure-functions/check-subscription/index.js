const { getSubscription } = require('../lib/table');

module.exports = async function (context, req) {
    context.log('Check Subscription processed a request.');

    if (req.method === 'OPTIONS') {
        context.res = { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } };
        return;
    }

    const { email } = req.body;

    if (!email) {
        context.res = { status: 400, body: "Email is required" };
        return;
    }

    // START DEBUG LOG
    context.log('[CheckSubscription] Processing for email:', email);

    try {
        let sub = null;
        try {
            sub = await getSubscription(email);
        } catch (dbError) {
            context.log.error('[CheckSubscription] Database Error:', dbError);
            // Consume error and treat as no subscription
        }

        // Default to inactive if no record found
        let status = 'inactive';
        let expiry = null;
        let isActive = false;
        let canceledAt = null;
        let cancelAtPeriodEnd = false;

        if (sub) {
            status = sub.status || 'inactive';
            expiry = sub.currentPeriodEnd;
            canceledAt = sub.canceledAt || null;
            cancelAtPeriodEnd = sub.cancelAtPeriodEnd || false;

            // Active判定:
            // - status が 'active' または 'trialing'
            // - または 'canceled' だが有効期限内 (periodEnd > now)
            // - かつ currentPeriodEnd が未来（まだ有効期限内）
            const now = new Date();
            const periodEnd = expiry ? new Date(expiry) : null;

            isActive = (
                periodEnd && periodEnd > now &&
                (status === 'active' || status === 'trialing' || status === 'canceled')
            );
        } else {
            context.log('[CheckSubscription] No subscription found for:', email);
        }

        // Mock for testing if env var set
        if (process.env.MOCK_SUBSCRIPTION === 'true') {
            status = 'active';
            isActive = true;
        }

        context.res = {
            status: 200, // Always 200 to prevent JSON parse errors on frontend
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: {
                active: isActive,
                hasSubscriptionRecord: !!sub,
                status,
                expiry,
                canceledAt,
                cancelAtPeriodEnd
            }
        };
        context.log('[CheckSubscription] Response set successfully');

    } catch (error) {
        context.log.error("[CheckSubscription] Critical Error:", error);
        context.res = {
            status: 200, // Return 200 even on error to pass JSON to frontend
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: {
                active: false,
                error: error.message
            }
        };
    }
}
