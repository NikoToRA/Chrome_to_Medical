const { EmailClient } = require("@azure/communication-email");

function getClient() {
  const conn = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
  if (!conn) return null;
  try {
    return new EmailClient(conn);
  } catch (_) {
    return null;
  }
}

async function sendEmail({ to, subject, text, html }) {
  const client = getClient();
  const from = process.env.EMAIL_SENDER_ADDRESS; // e.g. "DoNotReply@<verified-domain>"
  if (!client || !from) {
    throw new Error("Email client not configured (ACS)");
  }

  const message = {
    senderAddress: from,
    recipients: { to: Array.isArray(to) ? to.map((e) => ({ address: e })) : [{ address: to }] },
    content: { subject, plainText: text || undefined, html: html || undefined }
  };

  const poller = await client.beginSend(message);
  await poller.pollUntilDone();
  return true;
}

module.exports = { sendEmail };

