const jwt = require('jsonwebtoken');
const Stripe = require('stripe');
const secret = process.env.JWT_SECRET;
const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

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

        // Check if Stripe is configured and we should redirect to Checkout
        const hasStripe = !!stripe;
        const hasPriceId = !!process.env.STRIPE_PRICE_ID;
        const hasSuccessUrl = !!process.env.SUCCESS_PAGE_URL;
        const shouldRedirectToCheckout = hasStripe && hasPriceId && hasSuccessUrl;
        
        context.log('[AuthVerifyToken] Configuration check:', {
            hasStripe,
            hasPriceId,
            hasSuccessUrl,
            shouldRedirectToCheckout,
            email
        });
        
        if (shouldRedirectToCheckout) {
            // Create Stripe Checkout session and redirect
            try {
                const successUrl = `${process.env.SUCCESS_PAGE_URL}?token=${encodeURIComponent(sessionToken)}`;
                const cancelUrl = process.env.CANCEL_PAGE_URL || `${process.env.SUCCESS_PAGE_URL.replace('/success', '/cancel')}`;

                context.log('[AuthVerifyToken] Creating Stripe Checkout session:', {
                    email,
                    successUrl: successUrl.substring(0, 100) + '...', // Log partial URL for security
                    cancelUrl: cancelUrl.substring(0, 100) + '...',
                    priceId: process.env.STRIPE_PRICE_ID
                });

                const session = await stripe.checkout.sessions.create({
                    customer_email: email,
                    payment_method_types: ['card'],
                    billing_address_collection: 'required',
                    line_items: [
                        {
                            price: process.env.STRIPE_PRICE_ID,
                            quantity: 1,
                        },
                    ],
                    mode: 'subscription',
                    subscription_data: {
                        trial_period_days: 14,
                        metadata: {
                            email: email,
                            sessionToken: sessionToken
                        }
                    },
                    metadata: {
                        email: email,
                        sessionToken: sessionToken
                    },
                    success_url: successUrl,
                    cancel_url: cancelUrl,
                });

                context.log('[AuthVerifyToken] Stripe Checkout session created successfully:', {
                    sessionId: session.id,
                    hasUrl: !!session.url
                });

                // Redirect to Stripe Checkout
                context.res = {
                    status: 302,
                    headers: {
                        'Location': session.url,
                        'Cache-Control': 'no-store'
                    }
                };
                return;
            } catch (stripeError) {
                context.log.error('[AuthVerifyToken] Stripe Checkout session creation failed:', {
                    message: stripeError.message,
                    type: stripeError.type,
                    code: stripeError.code,
                    statusCode: stripeError.statusCode,
                    stack: stripeError.stack
                });
                
                // Return error page instead of falling through
                context.res = {
                    status: 500,
                    headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' },
                    body: `
                    <html>
                        <head>
                            <title>エラーが発生しました</title>
                            <style>
                                body { font-family: sans-serif; text-align: center; padding: 50px; }
                                .error-box { background: #ffebee; padding: 20px; margin: 20px auto; max-width: 600px; border-radius: 8px; border: 1px solid #ef5350; }
                                .error-title { color: #c62828; font-size: 24px; margin-bottom: 16px; }
                                .error-message { color: #666; margin-bottom: 16px; }
                                .token-box { background: #f0f0f0; padding: 20px; margin: 20px auto; max-width: 600px; word-break: break-all; border-radius: 8px; }
                                button { padding: 10px 20px; font-size: 16px; cursor: pointer; margin-top: 16px; }
                            </style>
                        </head>
                        <body>
                            <div class="error-box">
                                <div class="error-title">⚠️ 決済画面の作成に失敗しました</div>
                                <div class="error-message">
                                    Stripe Checkoutセッションの作成中にエラーが発生しました。<br/>
                                    以下のトークンを使用して、手動でログインしてください。
                                </div>
                            </div>
                            <div class="token-box" id="token">${sessionToken}</div>
                            <button onclick="copyToken()">トークンをコピー</button>
                            <script>
                                function copyToken() {
                                    const token = document.getElementById('token').innerText;
                                    navigator.clipboard.writeText(token).then(() => {
                                        alert('トークンをコピーしました！');
                                    });
                                }
                            </script>
                        </body>
                    </html>
                    `
                };
                return;
            }
        } else {
            context.log.warn('[AuthVerifyToken] Stripe Checkout redirect skipped - missing configuration:', {
                hasStripe,
                hasPriceId,
                hasSuccessUrl
            });
            
            // Show configuration error page
            const missingConfig = [];
            if (!hasStripe) missingConfig.push('STRIPE_SECRET_KEY');
            if (!hasPriceId) missingConfig.push('STRIPE_PRICE_ID');
            if (!hasSuccessUrl) missingConfig.push('SUCCESS_PAGE_URL');
            
            context.res = {
                status: 500,
                headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' },
                body: `
                <html>
                    <head>
                        <title>設定エラー</title>
                        <style>
                            body { font-family: sans-serif; text-align: center; padding: 50px; }
                            .error-box { background: #fff3e0; padding: 20px; margin: 20px auto; max-width: 600px; border-radius: 8px; border: 1px solid #ffb74d; }
                            .error-title { color: #e65100; font-size: 24px; margin-bottom: 16px; }
                            .error-message { color: #666; margin-bottom: 16px; }
                            .token-box { background: #f0f0f0; padding: 20px; margin: 20px auto; max-width: 600px; word-break: break-all; border-radius: 8px; }
                            button { padding: 10px 20px; font-size: 16px; cursor: pointer; margin-top: 16px; }
                        </style>
                    </head>
                    <body>
                        <div class="error-box">
                            <div class="error-title">⚠️ 設定が不完全です</div>
                            <div class="error-message">
                                以下の環境変数が設定されていません:<br/>
                                <strong>${missingConfig.join(', ')}</strong><br/><br/>
                                以下のトークンを使用して、手動でログインしてください。
                            </div>
                        </div>
                        <div class="token-box" id="token">${sessionToken}</div>
                        <button onclick="copyToken()">トークンをコピー</button>
                        <script>
                            function copyToken() {
                                const token = document.getElementById('token').innerText;
                                navigator.clipboard.writeText(token).then(() => {
                                    alert('トークンをコピーしました！');
                                });
                            }
                        </script>
                    </body>
                </html>
                `
            };
            return;
        }

        // Fallback: Return HTML with the token and attempt to deliver to extension
        const extensionId = process.env.EXTENSION_ID || '';
        const html = `
        <html>
            <head>
                <title>Login Successful</title>
                <style>
                    body { font-family: sans-serif; text-align: center; padding: 50px; }
                    .token-box { background: #f0f0f0; padding: 20px; margin: 20px auto; max-width: 600px; word-break: break-all; }
                    button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
                    .hint { color: #666; font-size: 14px; }
                </style>
            </head>
            <body>
                <h1>Login Successful!</h1>
                <p>Please copy the token below and paste it into the extension.</p>
                <div class="token-box" id="token">${sessionToken}</div>
                <button onclick="copyToken()">Copy Token</button>
                <p class="hint">If the extension is installed, we will try to sign you in automatically.</p>
                <script>
                    function copyToken() {
                        const token = document.getElementById('token').innerText;
                        navigator.clipboard.writeText(token).then(() => {
                            alert('Copied!');
                        });
                    }
                    (function(){
                      var extId = ${extensionId ? '`' + '${extensionId}' + '`' : '""'};
                      if (!extId || !(window.chrome && chrome.runtime && chrome.runtime.sendMessage)) return;
                      try {
                        chrome.runtime.sendMessage(extId, { action: 'loginWithToken', token: '${sessionToken}' }, function(resp){
                          // No-op; fallback is manual copy
                        });
                      } catch (e) {}
                    })();
                </script>
            </body>
        </html>
        `;

        context.res = {
            headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' },
            body: html
        };

    } catch (error) {
        context.log.error('[AuthVerifyToken] Token verification failed:', {
            message: error.message,
            name: error.name,
            token: token ? token.substring(0, 50) + '...' : 'missing'
        });
        
        // Check if token is expired
        let errorMessage = "無効または期限切れのトークンです";
        let errorDetails = "";
        
        if (error.name === 'TokenExpiredError') {
            errorMessage = "トークンの有効期限が切れています";
            errorDetails = "Magic Linkの有効期限は15分です。新しいMagic Linkをリクエストしてください。";
        } else if (error.name === 'JsonWebTokenError') {
            errorMessage = "無効なトークンです";
            errorDetails = "トークンの形式が正しくありません。";
        } else if (error.name === 'NotBeforeError') {
            errorMessage = "トークンがまだ有効になっていません";
            errorDetails = "トークンの有効開始時刻がまだ来ていません。";
        }
        
        context.res = {
            status: 401,
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
            body: `
            <html>
                <head>
                    <title>認証エラー</title>
                    <meta charset="utf-8">
                    <style>
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                            text-align: center; 
                            padding: 50px 20px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            min-height: 100vh;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0;
                        }
                        .error-container {
                            background: white;
                            border-radius: 16px;
                            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                            max-width: 600px;
                            width: 100%;
                            padding: 48px;
                        }
                        .error-icon {
                            font-size: 64px;
                            margin-bottom: 24px;
                        }
                        .error-title {
                            font-size: 28px;
                            font-weight: 700;
                            color: #c62828;
                            margin-bottom: 16px;
                        }
                        .error-message {
                            font-size: 18px;
                            color: #333;
                            margin-bottom: 12px;
                        }
                        .error-details {
                            font-size: 14px;
                            color: #666;
                            margin-bottom: 32px;
                            line-height: 1.6;
                        }
                        .action-button {
                            display: inline-block;
                            padding: 14px 32px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            text-decoration: none;
                            border-radius: 8px;
                            font-weight: 600;
                            font-size: 16px;
                            transition: transform 0.2s, box-shadow 0.2s;
                        }
                        .action-button:hover {
                            transform: translateY(-2px);
                            box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
                        }
                    </style>
                </head>
                <body>
                    <div class="error-container">
                        <div class="error-icon">⚠️</div>
                        <div class="error-title">${errorMessage}</div>
                        <div class="error-message">認証に失敗しました</div>
                        ${errorDetails ? `<div class="error-details">${errorDetails}</div>` : ''}
                        <a href="/" class="action-button">トップページに戻る</a>
                    </div>
                </body>
            </html>
            `
        };
    }
};
