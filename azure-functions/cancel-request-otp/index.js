const { upsertUser, getUser } = require('../lib/table');
const sgMail = require('@sendgrid/mail');

const sendgridKey = process.env.SENDGRID_API_KEY;
if (sendgridKey) {
    sgMail.setApiKey(sendgridKey);
}

module.exports = async function (context, req) {
    const { email } = req.body;

    if (!email) {
        context.res = { status: 400, body: "Email required" };
        return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

    try {
        await upsertUser(email, {
            cancellationOtp: otp,
            cancellationOtpExpires: expiresAt
        });

        const msg = {
            to: email,
            from: 'no-reply@karte-ai-plus.com',
            subject: 'Karte AI+ Cancellation Code',
            text: `Your cancellation code is: ${otp}`,
            html: `<p>Your cancellation code is: <strong>${otp}</strong></p>`
        };

        if (sendgridKey) {
            await sgMail.send(msg);
        } else {
            context.log("SendGrid Key missing. OTP:", otp);
        }

        context.res = {
            body: { message: "OTP sent" }
        };
    } catch (error) {
        context.log.error(error);
        context.res = { status: 500, body: "Internal Server Error" };
    }
};
