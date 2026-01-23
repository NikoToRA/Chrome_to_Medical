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
