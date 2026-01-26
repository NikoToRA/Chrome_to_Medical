const { EmailClient } = require("@azure/communication-email");

// Support both AZURE_COMMUNICATION_CONNECTION_STRING and ACS_CONNECTION_STRING
const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING || process.env.ACS_CONNECTION_STRING;

// SENDER_EMAIL_ADDRESS は必須（フォールバックなし）
// デフォルトドメインへのフォールバックは Gmail での遅延の原因となるため削除
const senderAddress = process.env.SENDER_EMAIL_ADDRESS;
if (!senderAddress) {
    console.error("[Email] CRITICAL: SENDER_EMAIL_ADDRESS is not configured. Email sending will fail.");
}

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

    if (!senderAddress) {
        console.error("[Email] SENDER_EMAIL_ADDRESS is not configured.");
        throw new Error("SENDER_EMAIL_ADDRESS is not configured. Please set the environment variable.");
    }

    console.log(`[Email] Attempting to send email to: ${to}, Subject: ${subject}, From: ${senderAddress}`);

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
