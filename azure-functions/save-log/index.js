const { saveToBlob } = require('../lib/blob');
const { requireAuth } = require('../lib/auth');

module.exports = async function (context, req) {
    context.log('Save Log function processed a request.');

    if (req.method === 'OPTIONS') {
        context.res = {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        };
        return;
    }

    const { type, content, metadata, phi, embeddingOptIn } = req.body || {};

    // Authenticate
    let email;
    try {
        ({ email } = await requireAuth(context, req));
    } catch (e) {
        context.res = { status: e.status || 401, body: { error: e.message } };
        return;
    }

    if (!content) {
        context.res = {
            status: 400,
            body: "Missing content"
        };
        return;
    }

    try {
        // Fetch user status
        const { getUser, upsertLogMetadata } = require('../lib/table');
        const user = await getUser(email);
        const contractStatus = user ? user.contractStatus : 'Unknown';

        const date = new Date().toISOString().split('T')[0];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const blobName = `${email}/${date}/${timestamp}-${type || 'log'}.json`;

        const logData = {
            userId: email,
            timestamp: new Date().toISOString(),
            type,
            content,
            metadata,
            contractStatus,
            phi: !!phi,
            embeddingOptIn: !!embeddingOptIn
        };

        const url = await saveToBlob('user-logs', blobName, logData);

        // Save Metadata
        await upsertLogMetadata(email, blobName, {
            contractStatus,
            phi: !!phi,
            embeddingOptIn: !!embeddingOptIn,
            timestamp: new Date().toISOString()
        });

        context.res = {
            body: { success: true, url }
        };
    } catch (error) {
        context.log.error("Error saving log:", error);
        context.res = {
            status: 500,
            body: { error: error.message }
        };
    }
}
