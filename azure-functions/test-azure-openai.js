const { AzureOpenAI } = require("openai");

console.log("Testing AzureOpenAI initialization...\n");

// Test 1: Using direct parameters (current approach)
console.log("Test 1: Direct parameters with 'apiKey'");
try {
    const client1 = new AzureOpenAI({
        endpoint: "https://karteaiplus.cognitiveservices.azure.com/",
        apiKey: "test-key",
        apiVersion: "2024-08-01-preview"
    });
    console.log("✓ Success with 'apiKey'");
} catch (error) {
    console.log("✗ Failed with 'apiKey':", error.message);
}

// Test 2: Using environment variable
console.log("\nTest 2: Environment variable AZURE_OPENAI_API_KEY");
process.env.AZURE_OPENAI_API_KEY = "test-key";
process.env.AZURE_OPENAI_ENDPOINT = "https://karteaiplus.cognitiveservices.azure.com/";
try {
    const client2 = new AzureOpenAI({
        apiVersion: "2024-08-01-preview"
    });
    console.log("✓ Success with environment variables");
} catch (error) {
    console.log("✗ Failed with environment variables:", error.message);
}

// Test 3: Check what constructor expects
console.log("\nTest 3: Testing with actual credentials");
process.env.AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_KEY;
try {
    const client3 = new AzureOpenAI({
        apiVersion: "2024-08-01-preview"
    });
    console.log("✓ Success! Client created");
    console.log("Client endpoint:", client3.baseURL || "not exposed");
} catch (error) {
    console.log("✗ Failed:", error.message);
}
