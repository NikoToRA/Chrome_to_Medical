const { TableClient } = require("@azure/data-tables");
const { sendEmail } = require('../lib/email');

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const sendgridKey = process.env.SENDGRID_API_KEY; // optional fallback
let sgMail = null;
if (sendgridKey) {
    try { sgMail = require('@sendgrid/mail'); sgMail.setApiKey(sendgridKey); } catch (_) {}
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
                    const subject = 'Karte AI+ Trial Ending Soon';
                    const text = 'Your trial ends in 2 days. You will be charged unless you cancel.';
                    const html = '<p>Your trial ends in 2 days. You will be charged unless you cancel.</p>';
                    try {
                        await sendEmail({ to: email, subject, text, html });
                        context.log(`Sent reminder to ${email}`);
                    } catch (e) {
                        if (sgMail) {
                            await sgMail.send({ to: email, from: 'no-reply@karte-ai-plus.com', subject, text, html });
                            context.log(`Sent reminder (fallback) to ${email}`);
                        } else {
                            context.log(`Reminder (not sent) to ${email} – email not configured`);
                        }
                    }
                }
            }
        }
    } catch (error) {
        context.log.error("Error in trial reminder:", error);
    }
};
