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

        if (sub) {
            status = sub.status || 'inactive';
            expiry = sub.currentPeriodEnd;
        }

        // Mock for testing if env var set
        if (process.env.MOCK_SUBSCRIPTION === 'true') {
            status = 'active';
        }

        context.res = {
            body: {
                active: status === 'active',
                status,
                expiry
            }
        };
    } catch (error) {
        context.log.error("Error checking subscription:", error);
        context.res = { status: 500, body: { error: error.message } };
    }
}
