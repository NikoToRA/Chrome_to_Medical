const { AzureOpenAI } = require("openai");

module.exports = async function (context, req) {
    context.log('[CHAT] Request received');

    // 1. Validate Request
    if (!req.body || !req.body.messages) {
        context.res = {
            status: 400,
            body: "Please pass messages in the request body"
        };
        return;
    }

    const { messages, system } = req.body;

    // 2. Initialize OpenAI Client
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    // Deployment name is strictly managed by environment variables for security and cost control
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o-mini";

    if (!endpoint || !apiKey) {
        context.log.error('[CHAT] Missing Azure OpenAI Credentials');
        context.res = {
            status: 500,
            body: "Server configuration error: Missing OpenAI credentials"
        };
        return;
    }

    try {
        const client = new AzureOpenAI({
            endpoint,
            apiKey,
            apiVersion: "2024-08-01-preview",
            deployment
        });

        // 3. Prepare Messages
        // Ensure system message is at the start if provided
        let conversation = [...messages];
        if (system) {
            conversation.unshift({ role: "system", content: system });
        }

        context.log(`[CHAT] Sending ${conversation.length} messages to model ${deployment}`);

        // 4. Call OpenAI
        const response = await client.chat.completions.create({
            messages: conversation,
            model: deployment, // In Azure, this is often ignored in favor of deployment name in URL, but good to keep
            max_completion_tokens: 5000,
        });

        // 5. Return Response
        const reply = response.choices[0].message;

        const responseBody = {
            role: reply.role,
            content: reply.content || "", // Ensure content is not null
            usage: response.usage
        };

        context.log('[CHAT] Response payload:', JSON.stringify(responseBody));

        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: responseBody
        };

    } catch (error) {
        context.log.error('[CHAT] OpenAI Error:', error);
        context.res = {
            status: 500,
            body: {
                error: "OpenAI API Error",
                details: error.message
            }
        };
    }
};
