const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');
const { getUser } = require('../lib/table');

const secret = process.env.JWT_SECRET;
const sendgridKey = process.env.SENDGRID_API_KEY;

if (sendgridKey) {
    sgMail.setApiKey(sendgridKey);
}

module.exports = async function (context, req) {
    const { email, name, facilityName, address, phone } = req.body || {};

    if (!secret) {
        context.res = { status: 500, body: "Server misconfigured: JWT secret not set" };
        return;
    }

    if (!email) {
        context.res = { status: 400, body: "Email is required" };
        return;
    }

    // Save user profile if provided
    if (name || facilityName || address || phone) {
        try {
            const { upsertUser } = require('../lib/table');
            await upsertUser(email, { name, facilityName, address, phone });
        } catch (e) {
            context.log.error("Failed to save user profile", e);
            // Continue to send link even if save fails? 
            // Maybe better to fail so they try again? 
            // For now, log and continue.
        }
    }

    const token = jwt.sign({ email }, secret, { expiresIn: '15m' });

    // Construct Magic Link
    // Need the function app URL.
    // In Azure, it's usually https://<app>.azurewebsites.net
    // We can get it from headers or env.
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'http'; // Default to http for local
    const baseUrl = `${protocol}://${host}`;
    const magicLink = `${baseUrl}/api/auth-verify-token?token=${token}`;

    const msg = {
        to: email,
        from: 'no-reply@karte-ai-plus.com', // Replace with verified sender
        subject: 'Karte AI+ Login Link',
        text: `Click here to login: ${magicLink}`,
        html: `<p>Click here to login:</p><a href="${magicLink}">Login to Karte AI+</a>`
    };

    try {
        if (sendgridKey) {
            await sgMail.send(msg);
        } else {
            context.log("SendGrid Key missing. Magic Link:", magicLink);
        }

        context.res = {
            body: { message: "Magic link sent" }
        };
    } catch (error) {
        context.log.error(error);
        context.res = {
            status: 500,
            body: "Failed to send email"
        };
    }
};
