const { upsertUser, getUser } = require('../lib/table');

module.exports = async function (context, req) {
    const method = req.method;
    const email = req.query.email || (req.body && req.body.email);

    if (!email) {
        context.res = { status: 400, body: "Email required" };
        return;
    }

    try {
        if (method === 'GET') {
            const user = await getUser(email);
            context.res = {
                body: {
                    contractStatus: user ? user.contractStatus : 'Unknown',
                    consentDate: user ? user.consentDate : null
                }
            };
        } else if (method === 'POST') {
            const { contractStatus } = req.body;
            if (!contractStatus) {
                context.res = { status: 400, body: "contractStatus required" };
                return;
            }
            await upsertUser(email, { contractStatus });
            context.res = { body: { message: "Status updated" } };
        }
    } catch (error) {
        context.log.error(error);
        context.res = { status: 500, body: "Internal Server Error" };
    }
};
