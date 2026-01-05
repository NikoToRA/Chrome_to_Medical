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

async function readFromBlob(containerName, blobName) {
    if (!connectionString) {
        throw new Error("Azure Storage Connection String not found");
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
        const downloadBlockBlobResponse = await blockBlobClient.download(0);
        const downloaded = await streamToBuffer(downloadBlockBlobResponse.readableStreamBody);
        return JSON.parse(downloaded.toString());
    } catch (error) {
        if (error.statusCode === 404) {
            return null; // Not found
        }
        throw error;
    }
}

async function streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => {
            chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });
        readableStream.on("end", () => {
            resolve(Buffer.concat(chunks));
        });
        readableStream.on("error", reject);
    });
}

module.exports = {
    saveToBlob,
    readFromBlob
};
