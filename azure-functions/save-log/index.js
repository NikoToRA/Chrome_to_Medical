const { saveToBlob } = require('../lib/blob');

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

    const { userId, type, content, metadata } = req.body;

    if (!userId || !content) {
        context.res = {
            status: 400,
            body: "Missing userId or content"
        };
        return;
    }

    try {
        const date = new Date().toISOString().split('T')[0];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const blobName = `${userId}/${date}/${timestamp}-${type || 'log'}.json`;

        const logData = {
            userId,
            timestamp: new Date().toISOString(),
            type,
            content,
            metadata
        };

        const url = await saveToBlob('user-logs', blobName, logData);

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
