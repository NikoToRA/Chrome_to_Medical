const fs = require('fs');
const path = require('path');
const { TableClient } = require("@azure/data-tables");

let connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

// Try loading from local.settings.json if env var not set
if (!connectionString) {
    try {
        const settingsPath = path.join(__dirname, 'local.settings.json');
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            connectionString = settings.Values.AZURE_STORAGE_CONNECTION_STRING;
            console.log("Loaded connection string from local.settings.json");
        }
    } catch (e) {
        console.warn("Could not read local.settings.json:", e.message);
    }
}

if (!connectionString) {
    console.error("Error: AZURE_STORAGE_CONNECTION_STRING is not set.");
    console.error("Please make sure you are in the correct directory (azure-functions) or have the variable set in your environment.");
    process.exit(1);
}

async function clearTable(tableName, partitionKey) {
    console.log(`Starting to clear table: ${tableName} (PartitionKey: ${partitionKey})...`);
    try {
        const client = TableClient.fromConnectionString(connectionString, tableName);
        const entities = client.listEntities();

        let count = 0;
        for await (const entity of entities) {
            // Safety check: only delete your test data if possible, but here we assume 'all allowed tokens' means wipe all users.
            // Since this is a test environment task, we delete everything.
            try {
                // Check if partition key matches to avoid deleting unexpected data if table is shared (though usually it's fine)
                if (entity.partitionKey === partitionKey) {
                    await client.deleteEntity(entity.partitionKey, entity.rowKey);
                    console.log(`Deleted: ${entity.rowKey} (${entity.email || 'no-email'})`);
                    count++;
                } else {
                    console.log(`Skipping entity with different partition key: ${entity.partitionKey}`);
                }
            } catch (err) {
                console.error(`Failed to delete ${entity.rowKey}:`, err.message);
            }
        }
        console.log(`Finished clearing ${tableName}. Total deleted: ${count}`);
    } catch (e) {
        if (e.statusCode === 404) {
            console.log(`Table ${tableName} does not exist.`);
        } else {
            console.error(`Error processing table ${tableName}:`, e);
        }
    }
}

async function main() {
    console.log("WARNING: This will delete ALL data in Users and Subscriptions tables.");
    console.log("Waiting 5 seconds before proceeding... (Ctrl+C to cancel)");

    await new Promise(resolve => setTimeout(resolve, 5000));

    await clearTable('Users', 'User');
    await clearTable('Subscriptions', 'Subscription');

    console.log("Done.");
}

main();
