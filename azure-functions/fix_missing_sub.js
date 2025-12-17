const { TableClient } = require("@azure/data-tables");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const client = TableClient.fromConnectionString(connectionString, "Subscriptions");

async function fixSubscription() {
    const email = "super206cc@gmail.com";
    const rowKey = Buffer.from(email.toLowerCase()).toString('base64');

    const entity = {
        partitionKey: "Subscription",
        rowKey: rowKey,
        status: "trialing",
        stripeCustomerId: "cus_Tb86e5mzJue6Ri",
        stripeSubscriptionId: "sub_1SdvpxDo5Xwxj8NXoGr7omPa",
        currentPeriodEnd: new Date(1766853509 * 1000).toISOString(),
        canceledAt: null,
        cancelAtPeriodEnd: false,
        createdDate: new Date().toISOString().split('T')[0]
    };

    try {
        await client.upsertEntity(entity);
        console.log(`Successfully restored subscription for ${email}`);
    } catch (e) {
        console.error(`Error restoring subscription: ${e.message}`);
    }
}

fixSubscription();
