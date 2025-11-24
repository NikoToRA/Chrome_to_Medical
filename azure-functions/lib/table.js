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
        updatedAt: new Date().toISOString(),
        ...data
    };

    await client.upsertEntity(entity, "Merge");
    return entity;
}

// Stripeサブスクリプション情報を詳細に保存
async function upsertStripeSubscription(stripeSubscriptionId, data) {
    const client = await getTableClient('StripeSubscriptions');
    const rowKey = stripeSubscriptionId;

    const entity = {
        partitionKey: "StripeSubscription",
        rowKey: rowKey,
        subscriptionId: stripeSubscriptionId,
        updatedAt: new Date().toISOString(),
        ...data
    };

    await client.upsertEntity(entity, "Merge");
    return entity;
}

// Stripeサブスクリプション情報を取得（subscription IDで）
async function getStripeSubscription(stripeSubscriptionId) {
    const client = await getTableClient('StripeSubscriptions');
    const rowKey = stripeSubscriptionId;

    try {
        const entity = await client.getEntity("StripeSubscription", rowKey);
        return entity;
    } catch (e) {
        if (e.statusCode === 404) return null;
        throw e;
    }
}

// Stripe顧客情報を保存
async function upsertStripeCustomer(customerId, data) {
    const client = await getTableClient('StripeCustomers');
    const rowKey = customerId;

    const entity = {
        partitionKey: "StripeCustomer",
        rowKey: rowKey,
        customerId: customerId,
        updatedAt: new Date().toISOString(),
        ...data
    };

    await client.upsertEntity(entity, "Merge");
    return entity;
}

// Stripe顧客情報を取得
async function getStripeCustomer(customerId) {
    const client = await getTableClient('StripeCustomers');
    const rowKey = customerId;

    try {
        const entity = await client.getEntity("StripeCustomer", rowKey);
        return entity;
    } catch (e) {
        if (e.statusCode === 404) return null;
        throw e;
    }
}

// 決済履歴を保存
async function insertPaymentHistory(paymentIntentId, data) {
    const client = await getTableClient('PaymentHistory');
    const rowKey = paymentIntentId;
    const timestamp = new Date().toISOString();

    const entity = {
        partitionKey: timestamp.split('T')[0], // 日付でパーティション分割
        rowKey: rowKey,
        paymentIntentId: paymentIntentId,
        createdAt: timestamp,
        ...data
    };

    await client.createEntity(entity);
    return entity;
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
    getSubscription,
    upsertStripeSubscription,
    getStripeSubscription,
    upsertStripeCustomer,
    getStripeCustomer,
    insertPaymentHistory,
    upsertUser,
    getUser,
    upsertLogMetadata
};

async function upsertUser(email, data) {
    const client = await getTableClient('Users');
    const rowKey = Buffer.from(email).toString('base64');

    const entity = {
        partitionKey: "User",
        rowKey: rowKey,
        email: email,
        ...data
    };

    await client.upsertEntity(entity, "Merge");
}

async function getUser(email) {
    const client = await getTableClient('Users');
    const rowKey = Buffer.from(email).toString('base64');

    try {
        const entity = await client.getEntity("User", rowKey);
        return entity;
    } catch (e) {
        if (e.statusCode === 404) return null;
        throw e;
    }
}

async function upsertLogMetadata(userId, blobName, data) {
    const client = await getTableClient('LogMetadata');
    // PartitionKey: userId, RowKey: blobName (sanitized?)
    // BlobName usually has slashes, RowKey cannot.
    // Use a unique ID or hash for RowKey, or replace slashes.
    const rowKey = Buffer.from(blobName).toString('base64');

    const entity = {
        partitionKey: userId, // Assuming userId is safe for PK
        rowKey: rowKey,
        blobName: blobName,
        ...data
    };

    await client.upsertEntity(entity, "Merge");
}
