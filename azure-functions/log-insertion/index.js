const { saveToBlob } = require('../lib/blob');

const DEFAULT_CONTAINER = process.env.AZURE_INSERTION_CONTAINER || 'clinical-insertions';

module.exports = async function (context, req) {
    context.log('[LOG INSERTION] Request received');

    if (req.method === 'OPTIONS') {
        context.res = {
            status: 204,
            headers: buildCorsHeaders()
        };
        return;
    }

    const body = req.body || {};
    const content = typeof body.content === 'string'
        ? body.content
        : JSON.stringify(body.content || '');

    if (!content || !content.trim()) {
        context.res = {
            status: 400,
            headers: buildCorsHeaders(),
            body: { error: 'Missing required content' }
        };
        return;
    }

    const userId = sanitizeId(body.userId) || 'anonymous';
    const action = sanitizeId(body.action) || 'unknown';
    const noteType = sanitizeId(body.noteType) || 'unknown';
    const metadata = isPlainObject(body.metadata) ? body.metadata : {};
    const recordedAt = new Date().toISOString();

    const sanitizedContent = content.length > 50000 ? content.slice(0, 50000) : content;

    const payload = {
        version: 1,
        userId,
        action,
        noteType,
        content: sanitizedContent,
        metadata: {
            ...metadata,
            recordedAt
        }
    };

    try {
        const blobName = buildBlobName(userId, action, recordedAt);
        const container = DEFAULT_CONTAINER;
        const url = await saveToBlob(container, blobName, payload);

        context.res = {
            status: 200,
            headers: buildCorsHeaders(),
            body: {
                success: true,
                blobUrl: url
            }
        };
    } catch (error) {
        context.log.error('[LOG INSERTION] Failed to save blob', error);
        context.res = {
            status: 500,
            headers: buildCorsHeaders(),
            body: { error: 'Failed to persist insertion' }
        };
    }
};

function buildBlobName(userId, action, timestamp) {
    const safeTime = timestamp.replace(/[:.]/g, '-');
    return `${userId}/${safeTime}-${action}.json`;
}

function sanitizeId(value) {
    if (!value || typeof value !== 'string') {
        return null;
    }
    return value.trim().slice(0, 120);
}

function isPlainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
}

function buildCorsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
}
