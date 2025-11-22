const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

async function getTableClient(tableName) {
    if (!connectionString) {
        throw new Error("Azure Storage Connection String not found");
    }
    const client = TableClient.fromConnectionString(connectionString, tableName);
    try {
        await client.createTable();
    } catch (e) {
        // Table might already exist
    }
    return client;
}

async function upsertSubscription(email, data) {
    const client = await getTableClient('Subscriptions');
    // Use email as RowKey (sanitized)
    const rowKey = Buffer.from(email).toString('base64');

    const entity = {
        partitionKey: "Subscription",
        rowKey: rowKey,
        email: email,
        ...data
    };

    await client.upsertEntity(entity, "Merge");
}

async function getSubscription(email) {
    const client = await getTableClient('Subscriptions');
    const rowKey = Buffer.from(email).toString('base64');

    try {
        const entity = await client.getEntity("Subscription", rowKey);
        return entity;
    } catch (e) {
        if (e.statusCode === 404) return null;
        throw e;
    }
}

module.exports = {
    upsertSubscription,
    getSubscription
};
