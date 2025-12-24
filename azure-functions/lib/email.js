const { EmailClient } = require("@azure/communication-email");

// Support both AZURE_COMMUNICATION_CONNECTION_STRING and ACS_CONNECTION_STRING
const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING || process.env.ACS_CONNECTION_STRING;
const senderAddress = process.env.SENDER_EMAIL_ADDRESS || "DoNotReply@56e74c6e-f57a-4dfe-9bfc-b6a2157f6e40.azurecomm.net";

let emailClient = null;
if (connectionString) {
    emailClient = new EmailClient(connectionString);
}

/**
 * Azure Communication Services を使用してメールを送信
 * @param {Object} options - メールオプション
 * @param {string} options.to - 送信先メールアドレス
 * @param {string} options.subject - 件名
 * @param {string} options.text - テキスト本文
 * @param {string} options.html - HTML本文
 * @returns {Promise<void>}
 */
async function sendEmail({ to, subject, text, html, attachments }) {
    if (!emailClient) {
        console.error("Azure Communication Services Email is not configured. Connection string missing.");
        throw new Error("Azure Communication Services Email is not configured");
    }

    console.log(`[Email] Attempting to send email to: ${to}, Subject: ${subject}`);

    const message = {
        senderAddress,
        content: {
            subject,
            plainText: text,
            html
        },
        recipients: {
            to: [{ address: to }]
        },
        attachments: attachments
    };

    try {
        console.log(`[Email] Calling beginSend...`);
        const poller = await emailClient.beginSend(message);
        console.log(`[Email] beginSend returned poller. Polling until done...`);
        const result = await poller.pollUntilDone();
        console.log(`[Email] Sent successfully to ${to}, MessageId: ${result.id}`);
        return result;
    } catch (error) {
        console.error(`[Email] Failed to send to ${to}:`, error);
        throw error;
    }
}

module.exports = {
    sendEmail
};
