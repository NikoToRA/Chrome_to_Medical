const { saveToBlob } = require('../lib/blob');

module.exports = async function (context, req) {
    context.log('Save Settings function processed a request.');

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

    // Auth check (Basic check for now, ideally verify token)
    const { userId, settings } = req.body;

    if (!userId || !settings) {
        context.res = {
            status: 400,
            body: { error: "Missing userId or settings" }
        };
        return;
    }

    try {
        // Save to user-data container
        // Path: userId/settings.json
        const blobName = `${userId}/settings.json`;

        // Metadata to specific what was saved
        const dataToSave = {
            userId,
            updatedAt: new Date().toISOString(),
            ...settings
        };

        const url = await saveToBlob('user-data', blobName, dataToSave);

        context.res = {
            body: { success: true, url, updatedAt: dataToSave.updatedAt }
        };
    } catch (error) {
        context.log.error("Error saving settings:", error);
        context.res = {
            status: 500,
            body: { error: error.message }
        };
    }
}
