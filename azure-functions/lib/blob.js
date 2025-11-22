const { BlobServiceClient } = require("@azure/storage-blob");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

async function saveToBlob(containerName, blobName, content) {
    if (!connectionString) {
        throw new Error("Azure Storage Connection String not found");
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Create container if not exists
    await containerClient.createIfNotExists();

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const data = JSON.stringify(content, null, 2);

    await blockBlobClient.upload(data, data.length);
    return blockBlobClient.url;
}

module.exports = {
    saveToBlob
};
