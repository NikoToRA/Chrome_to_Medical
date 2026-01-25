const jwt = require('jsonwebtoken');
const Stripe = require('stripe');
const { createErrorPage, createTokenDisplayPage } = require('../lib/error-pages');
const { getSubscription } = require('../lib/table');

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
        let isActive = false; // Initialize to avoid ReferenceError

        // Generate long-lived session token (1 year)
        const sessionToken = jwt.sign({ email, type: 'session' }, secret, { expiresIn: '365d' });

        // Check for duplicate registration (unless it's a test email with +test)
        const isTestEmail = email.includes('+test@');

        if (!isTestEmail) {
            try {
                const existingSubscription = await getSubscription(email);

                if (existingSubscription) {
                    isActive = (
                        (existingSubscription.status === 'active' || existingSubscription.status === 'trialing') &&
                        existingSubscription.currentPeriodEnd &&
                        new Date(existingSubscription.currentPeriodEnd) > new Date()
                    );

                    if (isActive) {
                        context.log('[AuthVerifyToken] Active user logging in:', { email });
                        // active but logging in again -> allow it, just skip checkout redirect
                        // "Duplicate registration blocked" block removed.
                    }
                }
            } catch (dbError) {
                context.log.warn('[AuthVerifyToken] Failed to check existing subscription:', dbError.message);
                // DB エラーの場合は処理を続行（重複チェック失敗でユーザーを止めない）
            }
        } else {
            context.log('[AuthVerifyToken] Test email detected, skipping duplicate check:', { email });
        }

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
            email,
            isTestEmail
        });

        if (!isActive) {
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

                    context.res = {
                        status: 500,
                        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
                        body: createTokenDisplayPage({
                            title: '⚠️ 決済画面の作成に失敗しました',
                            message: 'Stripe Checkoutセッションの作成中にエラーが発生しました。<br/>以下のトークンを使用して、手動でログインしてください。',
                            token: sessionToken
                        })
                    };
                    return;
                }
            } else {
                // Not active AND missing config -> Error
                const missingConfig = [];
                if (!hasStripe) missingConfig.push('STRIPE_SECRET_KEY');
                if (!hasPriceId) missingConfig.push('STRIPE_PRICE_ID');
                if (!hasSuccessUrl) missingConfig.push('SUCCESS_PAGE_URL');

                context.log.warn('[AuthVerifyToken] Missing configuration:', missingConfig);

                context.res = {
                    status: 500,
                    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
                    body: createTokenDisplayPage({
                        title: '⚠️ 設定が不完全です',
                        message: `以下の環境変数が設定されていません:<br/><strong>${missingConfig.join(', ')}</strong><br/><br/>以下のトークンを使用して、手動でログインしてください。`,
                        token: sessionToken
                    })
                };
                return;
            }
        }

        // If we are here, it means isActive === true.
        // Proceed to return HTML with token (Login Successful).


        // Fallback: Return HTML with the token and attempt to deliver to extension
        const extensionId = process.env.EXTENSION_ID || '';
        const lpUrl = process.env.LP_URL || 'https://stkarteai1763705952.z11.web.core.windows.net';
        const html = `
        <html>
            <head>
                <title>ログイン成功 - Karte AI+</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        text-align: center;
                        padding: 50px 20px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        margin: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .container {
                        background: white;
                        border-radius: 16px;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                        max-width: 600px;
                        width: 100%;
                        padding: 48px;
                    }
                    h1 { color: #27ae60; margin-bottom: 16px; }
                    .success-icon { font-size: 64px; margin-bottom: 16px; }
                    .token-box {
                        background: #f0f0f0;
                        padding: 20px;
                        margin: 20px auto;
                        max-width: 100%;
                        word-break: break-all;
                        border-radius: 8px;
                        font-size: 12px;
                    }
                    button {
                        padding: 12px 24px;
                        font-size: 16px;
                        cursor: pointer;
                        background: #27ae60;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        margin: 8px;
                    }
                    button:hover { background: #219a52; }
                    .hint { color: #666; font-size: 14px; margin-top: 16px; }
                    .home-link {
                        display: inline-block;
                        margin-top: 24px;
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                    }
                    .home-link:hover { opacity: 0.9; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success-icon">✅</div>
                    <h1>ログイン成功！</h1>
                    <p>以下のトークンをコピーして、拡張機能に貼り付けてください。</p>
                    <div class="token-box" id="token">${sessionToken}</div>
                    <button onclick="copyToken()">トークンをコピー</button>
                    <p class="hint">拡張機能がインストールされている場合、自動的にログインを試みます。</p>
                    <a href="${lpUrl}" class="home-link">トップページに戻る</a>
                </div>
                <script>
                    function copyToken() {
                        const token = document.getElementById('token').innerText;
                        navigator.clipboard.writeText(token).then(() => {
                            alert('トークンをコピーしました！');
                        });
                    }
                    (function(){
                      var extId = "${extensionId}";
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
        let title = "無効または期限切れのトークンです";
        let details = "";

        if (error.name === 'TokenExpiredError') {
            title = "トークンの有効期限が切れています";
            details = "Magic Linkの有効期限は15分です。新しいMagic Linkをリクエストしてください。";
        } else if (error.name === 'JsonWebTokenError') {
            title = "無効なトークンです";
            details = "トークンの形式が正しくありません。";
        } else if (error.name === 'NotBeforeError') {
            title = "トークンがまだ有効になっていません";
            details = "トークンの有効開始時刻がまだ来ていません。";
        }

        context.log.error('[AuthVerifyToken] Token verification failed:', error.name);

        context.res = {
            status: 401,
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
            body: createErrorPage({
                title,
                icon: '⚠️',
                message: '認証に失敗しました',
                details
            })
        };
    }
};
