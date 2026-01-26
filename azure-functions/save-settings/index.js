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

    // Auth check (JWT required)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        context.res = { status: 401, body: JSON.stringify({ error: 'Unauthorized: Missing token' }) };
        return;
    }
    const token = authHeader.split(' ')[1];
    let tokenEmail = null;
    try {
        const jwt = require('jsonwebtoken');
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET missing');
        const decoded = jwt.verify(token, secret);
        tokenEmail = decoded.email || decoded.sub;
    } catch (e) {
        context.res = { status: 401, body: JSON.stringify({ error: 'Unauthorized: Invalid token' }) };
        return;
    }

    const { userId, settings } = req.body;

    if (!userId || !settings) {
        context.res = {
            status: 400,
            body: JSON.stringify({ error: "Missing userId or settings" })
        };
        return;
    }

    try {
        // Save to user-data container
        // Path: userId/settings.json
        // userId and token identity must match
        if (!userId || !tokenEmail || (userId.toLowerCase() !== tokenEmail.toLowerCase())) {
            context.res = { status: 401, body: JSON.stringify({ error: 'Unauthorized: userId mismatch' }) };
            return;
        }

        const blobName = `${tokenEmail}/settings.json`;

        // Metadata to specific what was saved
        const dataToSave = {
            userId,
            updatedAt: new Date().toISOString(),
            ...settings
        };

        const url = await saveToBlob('user-data', blobName, dataToSave);

        context.res = {
            body: JSON.stringify({ success: true, url, updatedAt: dataToSave.updatedAt })
        };
    } catch (error) {
        context.log.error("Error saving settings:", error);
        context.res = {
            status: 500,
            body: { error: "設定保存エラー", message: "設定の保存中にエラーが発生しました。" }
        };
    }
}
