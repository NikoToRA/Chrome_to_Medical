const http = require('http');
const url = require('url');
const { AzureOpenAI } = require("openai");

// 環境変数の読み込み（local.settings.jsonの内容を手動で設定、またはdotenv利用）
// ここではAzure CLIで取得した値をベースに設定します
const PORT = 7071;
const JWT_SECRET = process.env.JWT_SECRET || "";

// 環境変数から設定（ハードコード禁止）
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || "";
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY || "";
const AZURE_OPENAI_DEPLOYMENT_NAME = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "";

// Handlerロジックの再利用（依存関係を解決）
function resolveAzureConfig(rawEndpoint) {
    const config = {
        endpoint: rawEndpoint,
        apiVersion: "2024-08-01-preview" // Default
    };

    if (!rawEndpoint) return config;

    try {
        const parsed = new URL(rawEndpoint);
        const versionFromQuery = parsed.searchParams.get("api-version");

        if (versionFromQuery) {
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

const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);

    if (parsedUrl.pathname === '/api/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                console.log('[LocalServer] Chat Request:', data);

                const { messages, system, model: requestedModel } = data;

                // OpenAI Client Init
                const { endpoint, apiVersion } = resolveAzureConfig(AZURE_OPENAI_ENDPOINT);
                
                console.log('[LocalServer] Config:', { endpoint, apiVersion, deployment: AZURE_OPENAI_DEPLOYMENT_NAME });

                const client = new AzureOpenAI({
                    endpoint,
                    apiKey: AZURE_OPENAI_KEY,
                    apiVersion,
                    deployment: requestedModel || AZURE_OPENAI_DEPLOYMENT_NAME
                });

                let conversation = [...messages];
                if (system) {
                    conversation.unshift({ role: "system", content: system });
                }

                console.log(`[LocalServer] Sending request to Azure OpenAI...`);

                const response = await client.chat.completions.create({
                    messages: conversation,
                    model: requestedModel || AZURE_OPENAI_DEPLOYMENT_NAME,
                    max_completion_tokens: 1024,
                });

                const reply = response.choices[0].message;
                const responseBody = {
                    role: reply.role,
                    content: reply.content || "",
                    usage: response.usage
                };

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(responseBody));
                console.log('[LocalServer] Success');

            } catch (error) {
                console.error('[LocalServer] Error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message, details: error.stack }));
            }
        });
    } else if (parsedUrl.pathname === '/api/check-subscription') {
        // Mock subscription check
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ active: true }));
    } else if (parsedUrl.pathname === '/api/auth-verify-token') {
         // Mock token verification not needed for local demo token
         res.writeHead(200, { 'Content-Type': 'application/json' });
         res.end(JSON.stringify({ token: 'mock-session-token' }));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Local mock server running at http://localhost:${PORT}`);
});
