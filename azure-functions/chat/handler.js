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

    // 1.5 Validate Auth & Subscription
    try {
        const jwt = require('jsonwebtoken');
        const { getSubscription } = require('../lib/table');
        const secret = process.env.JWT_SECRET;
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            context.res = { status: 401, body: JSON.stringify({ error: "Unauthorized: Missing token" }) };
            return;
        }

        const token = authHeader.split(' ')[1];
        if (!secret) throw new Error("JWT_SECRET missing");

        const decoded = jwt.verify(token, secret);
        const email = decoded.email || decoded.sub;

        if (!email) {
            context.res = { status: 401, body: JSON.stringify({ error: "Unauthorized: Invalid token claims" }) };
            return;
        }

        const sub = await getSubscription(email);
        let isActive = false;
        if (sub) {
            const status = sub.status || 'inactive';
            const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
            const now = new Date();
            if (status === 'active' || status === 'trialing') {
                isActive = true;
            } else if ((status === 'canceled' || status === 'past_due') && periodEnd && periodEnd > now) {
                // Align with check-subscription: grace period allowed until currentPeriodEnd
                isActive = true;
            }
        }

        if (!isActive) {
            context.log.warn(`[CHAT] Access denied for ${email}: status=${sub ? sub.status : 'none'}`);
            context.res = {
                status: 403,
                body: JSON.stringify({ error: "Subscription required", code: "SUBSCRIPTION_INACTIVE" })
            };
            return;
        }

    } catch (authError) {
        context.log.error('[CHAT] Auth verification failed:', authError);
        context.res = {
            status: 401,
            body: JSON.stringify({ error: "Unauthorized", details: authError.message })
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
        const choice = response.choices && response.choices[0] ? response.choices[0] : null;
        const reply = choice ? choice.message : { role: 'assistant', content: '' };
        const finishReason = choice ? choice.finish_reason : undefined;

        const responseBody = {
            role: reply.role,
            content: (reply && typeof reply.content === 'string') ? reply.content : (Array.isArray(reply?.content) ? (reply.content[0]?.text || '') : ''),
            usage: response.usage,
            model: deployment,
            finish_reason: finishReason,
            // Some models may include refusal; surface it for client-side messaging
            refusal: reply?.refusal || undefined
        };

        context.log('[CHAT] Response payload:', JSON.stringify(responseBody));

        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(responseBody)
        };

    } catch (error) {
        context.log.error('[CHAT] OpenAI Error:', error);
        context.res = {
            status: 500,
            body: JSON.stringify({
                error: "OpenAI API Error",
                details: error.message
            })
        };
    }
};
