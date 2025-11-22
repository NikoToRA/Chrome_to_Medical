const openai = require("openai");

console.log("openai exports:", Object.keys(openai));
console.log("AzureOpenAI available:", !!openai.AzureOpenAI);

if (openai.AzureOpenAI) {
    console.log("✓ AzureOpenAI class is available");

    try {
        const client = new openai.AzureOpenAI({
            endpoint: process.env.AZURE_OPENAI_ENDPOINT,
            apiKey: process.env.AZURE_OPENAI_KEY,
            apiVersion: "2024-08-01-preview"
        });
        console.log("✓ AzureOpenAI client created successfully");
    } catch (error) {
        console.error("✗ Error creating AzureOpenAI client:", error.message);
    }
} else {
    console.error("✗ AzureOpenAI class is NOT available");
}
