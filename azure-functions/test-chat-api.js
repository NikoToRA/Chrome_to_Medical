const { AzureOpenAI } = require("openai");

async function testChat() {
    console.log("Testing Azure OpenAI chat...\n");

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-5-mini';

    console.log(`Endpoint: ${endpoint}`);
    console.log(`API Key: ${apiKey ? 'Set (length: ' + apiKey.length + ')' : 'Not set'}`);
    console.log(`Deployment: ${deploymentName}\n`);

    if (!endpoint || !apiKey) {
        console.error("❌ Azure OpenAI credentials not configured");
        return;
    }

    try {
        const client = new AzureOpenAI({
            endpoint: endpoint,
            apiKey: apiKey,
            apiVersion: "2024-08-01-preview"
        });

        console.log("✓ AzureOpenAI client created\n");

        const openaiMessages = [
            { role: 'system', content: 'あなたは親切なアシスタントです。' },
            { role: 'user', content: 'こんにちは' }
        ];

        console.log("Calling Azure OpenAI API...");

        const response = await client.chat.completions.create({
            model: deploymentName,
            messages: openaiMessages,
            max_completion_tokens: 1024
        });

        console.log("\n✓ Response received!");
        console.log(`Choices: ${response.choices?.length || 0}`);
        console.log(`Response: ${response.choices[0]?.message?.content || 'No content'}\n`);

    } catch (error) {
        console.error("\n❌ Error:", error.message);
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
        }
        console.error("\nFull error:", error);
    }
}

testChat();
