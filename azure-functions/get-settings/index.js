const { readFromBlob } = require('../lib/blob');

module.exports = async function (context, req) {
    context.log('Get Settings function processed a request.');

    // CORS support
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

    const { userId } = req.body;

    if (!userId) {
        context.res = {
            status: 400,
            body: { error: "Missing userId" }
        };
        return;
    }

    try {
        // Read from user-data container
        // Path: userId/settings.json
        const blobName = `${userId}/settings.json`;

        const settings = await readFromBlob('user-data', blobName);

        if (settings) {
            context.res = {
                body: { success: true, settings }
            };
        } else {
            // Not found - return empty/default state (Client will handle)
            context.res = {
                body: { success: true, settings: null, message: "No remote settings found" }
            };
        }

    } catch (error) {
        context.log.error("Error getting settings:", error);
        context.res = {
            status: 500,
            body: { error: error.message }
        };
    }
}
