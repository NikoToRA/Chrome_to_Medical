// Polyfill for Azure SDK expecting Web Crypto
if (typeof crypto === 'undefined') {
    try {
        const nodeCrypto = require('crypto');
        global.crypto = nodeCrypto.webcrypto || nodeCrypto;
    } catch (e) {
        console.error('Failed to polyfill crypto', e);
    }
}
const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

async function getTableClient(tableName) {
    console.log(`[TableClient] Initializing for table: ${tableName}`);
    if (!connectionString) {
        console.error("[TableClient] Connection string missing");
        throw new Error("Azure Storage Connection String not found");
    }
    try {
        const client = TableClient.fromConnectionString(connectionString, tableName);
        console.log(`[TableClient] Client created for ${tableName}`);

        try {
            await client.createTable();
            console.log(`[TableClient] ensureTable created/verified for ${tableName}`);
        } catch (e) {
            if (e.statusCode === 409) {
                // Table already exists, ignore
                console.log(`[TableClient] Table ${tableName} already exists`);
            } else {
                console.warn(`[TableClient] createTable warning for ${tableName}:`, e.message);
            }
        }
        return client;
    } catch (error) {
        console.error(`[TableClient] Critical error in getTableClient for ${tableName}:`, error);
        throw error;
    }
}

async function upsertSubscription(email, data) {
    const client = await getTableClient('Subscriptions');
    const safeEmail = (email || '').toLowerCase(); // Normalize
    const rowKey = Buffer.from(safeEmail).toString('base64');

    const entity = {
        partitionKey: "Subscription",
        rowKey: rowKey,
        email: safeEmail,
        ...data
    };

    await client.upsertEntity(entity, "Merge");
}

async function getSubscription(email) {
    const client = await getTableClient('Subscriptions');
    const safeEmail = (email || '').toLowerCase(); // Normalize
    const rowKey = Buffer.from(safeEmail).toString('base64');

    try {
        const entity = await client.getEntity("Subscription", rowKey);
        return entity;
    } catch (e) {
        if (e.statusCode === 404) return null;
        throw e;
    }
}

async function upsertUser(email, data) {
    const client = await getTableClient('Users');
    const safeEmail = (email || '').toLowerCase(); // Normalize
    const rowKey = Buffer.from(safeEmail).toString('base64');

    const entity = {
        partitionKey: "User",
        rowKey: rowKey,
        email: safeEmail,
        ...data,
        updatedAt: new Date().toISOString()
    };

    await client.upsertEntity(entity, "Merge");
}

async function getUser(email) {
    const client = await getTableClient('Users');
    const safeEmail = (email || '').toLowerCase(); // Normalize
    const rowKey = Buffer.from(safeEmail).toString('base64');

    try {
        const entity = await client.getEntity("User", rowKey);
        return entity;
    } catch (e) {
        if (e.statusCode === 404) return null;
        throw e;
    }
}

module.exports = {
    upsertSubscription,
    getSubscription,
    upsertUser,
    getUser,
    getSubscriptionByCreatedDate,
    getSubscriptionsByTrialEndRange,
    upsertReceipt
};

async function getSubscriptionByCreatedDate(dateStr) {
    const client = await getTableClient('Subscriptions');
    try {
        const subscriptions = [];
        // Note: This query might differ depending on how 'created' is stored. 
        // Assuming 'created' is stored as an ISO string or similar in the entity.
        // OData filter for date comparison. 
        // We need to match the date part. Since 'created' is likely a full timestamp, 
        // we might need to filter by range or rely on a specific 'createdDate' field if we add one.
        // For now, let's assume we are looking for a 'createdDate' field we will add to the subscription entity.

        const entities = client.listEntities({
            queryOptions: {
                filter: `createdDate eq '${dateStr}' and status eq 'trialing'`
            }
        });

        for await (const entity of entities) {
            subscriptions.push(entity);
        }
        return subscriptions;
    } catch (error) {
        console.error("Error getting subscriptions by date:", error);
        return [];
    }
}

async function upsertReceipt(receiptData) {
    const client = await getTableClient('Receipts');
    // Receipt needs a unique rowKey, usually receiptNumber
    if (!receiptData.receiptNumber) {
        throw new Error("Receipt number is required for RowKey");
    }

    const entity = {
        partitionKey: "Receipt",
        rowKey: receiptData.receiptNumber,
        ...receiptData,
        createdAt: new Date().toISOString()
    };

    await client.upsertEntity(entity, "Merge");
}

/**
 * Get subscriptions where trialEnd falls within the specified date range
 * Used for sending trial warning emails (e.g., 2 days before trial ends)
 * @param {string} startDate - ISO date string (start of range)
 * @param {string} endDate - ISO date string (end of range)
 */
async function getSubscriptionsByTrialEndRange(startDate, endDate) {
    const client = await getTableClient('Subscriptions');
    try {
        const subscriptions = [];

        // Query for trialing subscriptions where trialEnd is within the range
        const entities = client.listEntities({
            queryOptions: {
                filter: `status eq 'trialing' and trialEnd ge '${startDate}' and trialEnd lt '${endDate}'`
            }
        });

        for await (const entity of entities) {
            subscriptions.push(entity);
        }
        return subscriptions;
    } catch (error) {
        console.error("Error getting subscriptions by trial end range:", error);
        return [];
    }
}
