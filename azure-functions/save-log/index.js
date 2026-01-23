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

    // JWT check (require for non-anonymous logs)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (userId !== 'anonymous') {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            context.res = { status: 401, body: JSON.stringify({ error: 'Unauthorized: Missing token' }) };
            return;
        }
        try {
            const jwt = require('jsonwebtoken');
            const secret = process.env.JWT_SECRET;
            if (!secret) throw new Error('JWT_SECRET missing');
            const decoded = jwt.verify(authHeader.split(' ')[1], secret);
            const tokenEmail = decoded.email || decoded.sub;
            if (!tokenEmail || tokenEmail.toLowerCase() !== String(userId).toLowerCase()) {
                context.res = { status: 401, body: JSON.stringify({ error: 'Unauthorized: userId mismatch' }) };
                return;
            }
        } catch (e) {
            context.res = { status: 401, body: JSON.stringify({ error: 'Unauthorized: Invalid token' }) };
            return;
        }
    }

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
        const safeUser = (userId || 'anonymous').toLowerCase();
        const blobName = `${safeUser}/${date}/${timestamp}-${type || 'log'}.json`;

        const logData = {
            userId,
            timestamp: new Date().toISOString(),
            type,
            content,
            metadata
        };

        const url = await saveToBlob('user-logs', blobName, logData);

        context.res = {
            body: JSON.stringify({ success: true, url })
        };
    } catch (error) {
        context.log.error("Error saving log:", error);
        context.res = {
            status: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
}
