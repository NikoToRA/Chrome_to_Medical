const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;

module.exports = async function (context, req) {
    const token = req.query.token;

    if (!token) {
        context.res = { status: 400, body: "Token required" };
        return;
    }

    if (!secret) {
        context.res = { status: 500, body: "Server misconfigured: JWT secret not set" };
        return;
    }

    try {
        const decoded = jwt.verify(token, secret);
        const email = decoded.email;

        // Generate long-lived session token
        const sessionToken = jwt.sign({ email, type: 'session' }, secret, { expiresIn: '14d' });

        // Return HTML with the token
        const html = `
        <html>
            <head>
                <title>Login Successful</title>
                <style>
                    body { font-family: sans-serif; text-align: center; padding: 50px; }
                    .token-box { background: #f0f0f0; padding: 20px; margin: 20px auto; max-width: 600px; word-break: break-all; }
                    button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
                </style>
            </head>
            <body>
                <h1>Login Successful!</h1>
                <p>Please copy the token below and paste it into the extension.</p>
                <div class="token-box" id="token">${sessionToken}</div>
                <button onclick="copyToken()">Copy Token</button>
                <script>
                    function copyToken() {
                        const token = document.getElementById('token').innerText;
                        navigator.clipboard.writeText(token).then(() => {
                            alert('Copied!');
                        });
                    }
                </script>
            </body>
        </html>
        `;

        context.res = {
            headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' },
            body: html
        };

    } catch (error) {
        context.res = {
            status: 401,
            body: "Invalid or expired token"
        };
    }
};
