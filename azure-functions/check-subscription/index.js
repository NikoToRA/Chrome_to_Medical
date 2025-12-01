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

    try {
        const sub = await getSubscription(email);

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
            // - かつ currentPeriodEnd が未来（まだ有効期限内）
            // - かつ 'canceled' でない
            const now = new Date();
            const periodEnd = expiry ? new Date(expiry) : null;

            isActive = (
                (status === 'active' || status === 'trialing') &&
                periodEnd &&
                periodEnd > now &&
                status !== 'canceled'
            );

            context.log('[CheckSubscription] Subscription check:', {
                email,
                status,
                isActive,
                expiry,
                canceledAt,
                cancelAtPeriodEnd
            });
        } else {
            context.log('[CheckSubscription] No subscription found for:', email);
        }

        // Mock for testing if env var set
        if (process.env.MOCK_SUBSCRIPTION === 'true') {
            status = 'active';
            isActive = true;
        }

        context.res = {
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: {
                active: isActive,
                status,
                expiry,
                canceledAt,
                cancelAtPeriodEnd
            }
        };
    } catch (error) {
        context.log.error("[CheckSubscription] Error:", error);
        context.res = {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: { error: error.message }
        };
    }
}
