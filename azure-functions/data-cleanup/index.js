const { TableClient } = require("@azure/data-tables");
const { BlobServiceClient } = require("@azure/storage-blob");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

module.exports = async function (context, myTimer) {
    if (!connectionString) {
        context.log.error("Azure Storage Connection String not found");
        return;
    }

    const tableClient = TableClient.fromConnectionString(connectionString, "Users");
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient("user-logs");

    try {
        // Find Canceled users
        // Note: Table Storage filtering by date is tricky if not in PK/RK or separate field.
        // Assuming we have a 'cancellationDate' field.
        const entities = tableClient.listEntities({
            queryOptions: { filter: "contractStatus eq 'Canceled'" }
        });

        for await (const user of entities) {
            if (user.cancellationDate) {
                const cancelDate = new Date(user.cancellationDate);
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

                if (cancelDate < thirtyDaysAgo) {
                    context.log(`Deleting data for user: ${user.email}`);

                    // Delete blobs
                    // Prefix: userId/ (assuming userId is email)
                    for await (const blob of containerClient.listBlobsFlat({ prefix: user.email + '/' })) {
                        await containerClient.deleteBlob(blob.name);
                        context.log(`Deleted blob: ${blob.name}`);
                    }

                    // Also delete from LogMetadata?
                    // Implementation omitted for brevity, but recommended.
                }
            }
        }
    } catch (error) {
        context.log.error("Error in data cleanup:", error);
    }
};
