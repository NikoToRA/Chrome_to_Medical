const { upsertUser } = require('../lib/table');

module.exports = async function (context, req) {
    const { email, clinicName, lastName, firstName } = req.body;

    if (!email) {
        context.res = {
            status: 400,
            body: "Email is required"
        };
        return;
    }

    try {
        await upsertUser(email, {
            clinicName,
            lastName,
            firstName,
            registeredAt: new Date().toISOString(),
            status: 'Registered'
        });

        context.res = {
            body: { message: "User registered successfully" }
        };
    } catch (error) {
        context.log.error(error);
        context.res = {
            status: 500,
            body: "Internal Server Error"
        };
    }
};
