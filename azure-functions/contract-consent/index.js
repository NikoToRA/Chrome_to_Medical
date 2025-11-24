const { upsertUser, getUser } = require('../lib/table');
const sgMail = require('@sendgrid/mail');

const sendgridKey = process.env.SENDGRID_API_KEY;
if (sendgridKey) {
    sgMail.setApiKey(sendgridKey);
}

module.exports = async function (context, req) {
    const { email, agreedToTerms, agreedToPrivacy } = req.body;

    if (!email || !agreedToTerms || !agreedToPrivacy) {
        context.res = { status: 400, body: "Missing required fields" };
        return;
    }

    try {
        // 1. Update User Record
        await upsertUser(email, {
            agreedToTerms: true,
            agreedToPrivacy: true,
            consentDate: new Date().toISOString(),
            termsVersion: '1.0', // Manage versions
            contractStatus: 'Agreed'
        });

        // 2. Send PDF Email (Mock PDF)
        // In production, generate PDF or fetch from URL
        const msg = {
            to: email,
            from: 'no-reply@karte-ai-plus.com',
            subject: 'Karte AI+ Service Agreement',
            text: 'Thank you for agreeing to the terms. Please find the agreement attached.',
            html: '<p>Thank you for agreeing to the terms. Please find the agreement attached.</p>',
            attachments: [
                {
                    content: 'VGhpcyBpcyBhIG1vY2sgUERGIGNvbnRlbnQu', // "This is a mock PDF content." in base64
                    filename: 'agreement.pdf',
                    type: 'application/pdf',
                    disposition: 'attachment'
                }
            ]
        };

        if (sendgridKey) {
            await sgMail.send(msg);
        } else {
            context.log("SendGrid Key missing. Mock sending PDF to:", email);
        }

        context.res = {
            body: { message: "Consent recorded and email sent" }
        };

    } catch (error) {
        context.log.error(error);
        context.res = {
            status: 500,
            body: "Internal Server Error"
        };
    }
};
