const { TableClient } = require("@azure/data-tables");
const sgMail = require('@sendgrid/mail');

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const sendgridKey = process.env.SENDGRID_API_KEY;

if (sendgridKey) {
    sgMail.setApiKey(sendgridKey);
}

module.exports = async function (context, myTimer) {
    if (!connectionString) {
        context.log.error("Azure Storage Connection String not found");
        return;
    }

    const client = TableClient.fromConnectionString(connectionString, "Subscriptions");
    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const threeDaysLater = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    try {
        const entities = client.listEntities({
            queryOptions: { filter: "status eq 'trialing'" }
        });

        for await (const entity of entities) {
            const expiry = new Date(entity.currentPeriodEnd);

            // Check if expiry is between 48h and 72h from now (so we don't spam, run daily)
            // Or just check if it's close.
            // Simplified: check if it's within the next 2-3 days.
            if (expiry >= twoDaysLater && expiry < threeDaysLater) {
                const email = entity.email;
                if (email) {
                    const msg = {
                        to: email,
                        from: 'no-reply@karte-ai-plus.com',
                        subject: 'Karte AI+ Trial Ending Soon',
                        text: 'Your trial ends in 2 days. Please add a payment method to continue.',
                        html: '<p>Your trial ends in 2 days. Please add a payment method to continue.</p>'
                    };
                    if (sendgridKey) {
                        await sgMail.send(msg);
                        context.log(`Sent reminder to ${email}`);
                    } else {
                        context.log(`Mock sent reminder to ${email}`);
                    }
                }
            }
        }
    } catch (error) {
        context.log.error("Error in trial reminder:", error);
    }
};
