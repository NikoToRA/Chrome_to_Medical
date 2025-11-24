const { AzureOpenAI } = require("openai");

const DEFAULT_API_VERSION = "2024-08-01-preview";

function resolveAzureConfig(rawEndpoint) {
    const config = {
        endpoint: rawEndpoint,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || DEFAULT_API_VERSION
    };

    if (!rawEndpoint) {
        return config;
    }

    try {
        const parsed = new URL(rawEndpoint);
        const versionFromQuery = parsed.searchParams.get("api-version");

        if (versionFromQuery && !process.env.AZURE_OPENAI_API_VERSION) {
            config.apiVersion = versionFromQuery;
        }

        let cleanedPath = parsed.pathname.replace(/\/openai\/?.*$/i, "");

        if (!cleanedPath || cleanedPath === "/") {
            cleanedPath = "/";
        } else if (!cleanedPath.endsWith("/")) {
            cleanedPath = `${cleanedPath}/`;
        }

        config.endpoint = `${parsed.origin}${cleanedPath === "/" ? "/" : cleanedPath}`;
    } catch (error) {
        const sanitized = rawEndpoint.replace(/\/openai.*$/i, "");
        config.endpoint = sanitized.endsWith("/") ? sanitized : `${sanitized}/`;
    }

    return config;
}

const { requireAuth } = require('../lib/auth');
const { getSubscription } = require('../lib/table');

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

    const { messages, system, model: requestedModel } = req.body;

    // 1.5 Authenticate and authorize
    try {
        const { email } = await requireAuth(context, req);
        // Check subscription status by email
        const sub = await getSubscription(email);
        const status = sub?.status || 'inactive';
        const active = ['active', 'trialing'].includes(status);
        if (!active) {
            context.res = { status: 402, body: { error: 'Subscription inactive' } };
            return;
        }
    } catch (e) {
        context.res = { status: e.status || 401, body: { error: e.message } };
        return;
    }

    // 2. Initialize OpenAI Client
    const rawEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const { endpoint, apiVersion } = resolveAzureConfig(rawEndpoint);
    const apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY;
    const deploymentFromEnv = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-5-mini-2"; // Fallback or use user provided
    const deployment = requestedModel || deploymentFromEnv;

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
            apiVersion,
            deployment
        });

        // 3. Prepare Messages
        // Ensure system message is at the start if provided
        let conversation = [...messages];
        if (system) {
            conversation.unshift({ role: "system", content: system });
        }

        context.log(`[CHAT] Sending ${conversation.length} messages to model ${deployment} (apiVersion=${apiVersion})`);

        // 4. Call OpenAI
        const response = await client.chat.completions.create({
            messages: conversation,
            model: deployment,
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
