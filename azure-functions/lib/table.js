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
    getUser
};
