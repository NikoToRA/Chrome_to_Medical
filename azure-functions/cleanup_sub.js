const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const client = TableClient.fromConnectionString(connectionString, "Subscriptions");

async function deleteSubscription(email) {
    const rowKey = Buffer.from(email.toLowerCase()).toString('base64');
    try {
        await client.deleteEntity("Subscription", rowKey);
        console.log(`Deleted subscription for ${email}`);
    } catch (e) {
        console.log(`Error deleting: ${e.message}`);
    }
}

deleteSubscription("super206cc@gmail.com");
