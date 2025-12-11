const jwt = require('jsonwebtoken');

module.exports = async function (context, req) {
    try {
        // Lazy load to catch initialization errors
        const { sendEmail } = require('../lib/email');
        const secret = process.env.JWT_SECRET;

        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            context.res = {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            };
            return;
        }

        const { email, name, facilityName, address, phone } = req.body || {};

        if (!secret) {
            context.res = {
                status: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: "Server misconfigured: JWT secret not set"
            };
            return;
        }

        if (!email) {
            context.res = {
                status: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: "Email is required"
            };
            return;
        }

        // Save user profile if provided
        if (name || facilityName || address || phone) {
            try {
                const { upsertUser } = require('../lib/table');
                await upsertUser(email, { name, facilityName, address, phone });
            } catch (e) {
                context.log.error("Failed to save user profile", e);
                // Continue to send link even if save fails? 
                // Maybe better to fail so they try again? 
                // For now, log and continue.
            }
        }

        const token = jwt.sign({ email }, secret, { expiresIn: '15m' });

        // Construct Magic Link
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const protocol = req.headers['x-forwarded-proto'] || 'http'; // Default to http for local
        const baseUrl = `${protocol}://${host}`;
        const magicLink = `${baseUrl}/api/auth-verify-token?token=${token}`;

        // 日本語メールテンプレート
        const subject = '【Karte AI+】ログイン用リンクをお送りします';
        const displayName = name || facilityName || email;

        const text = `
Karte AI+ をご利用いただき、ありがとうございます。

${displayName} 様

以下のリンクをクリックして、ログインと決済手続きを完了してください。

${magicLink}

※ このリンクの有効期限は15分です。
※ このメールに心当たりがない場合は、無視していただいて構いません。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Karte AI+
電子カルテ作成をAIで効率化
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

        const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Karte AI+ ログインリンク</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h1 style="color: #667eea; margin-top: 0; font-size: 24px;">Karte AI+</h1>
        <p style="color: #666; margin-bottom: 0;">電子カルテ作成をAIで効率化</p>
    </div>
    
    <div style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px;">
        <h2 style="color: #333; font-size: 20px; margin-top: 0;">ログイン用リンクをお送りします</h2>
        
        <p style="color: #666; font-size: 14px;">
            ${displayName} 様
        </p>
        
        <p style="color: #333; font-size: 16px;">
            Karte AI+ をご利用いただき、ありがとうございます。<br>
            以下のボタンをクリックして、ログインと決済手続きを完了してください。
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}" 
               style="display: inline-block; background-color: #667eea; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                ログインして決済手続きを進める
            </a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
            ボタンがクリックできない場合は、以下のリンクをコピーしてブラウザのアドレスバーに貼り付けてください：
        </p>
        <p style="color: #667eea; font-size: 12px; word-break: break-all; background-color: #f8f9fa; padding: 12px; border-radius: 4px; margin: 10px 0;">
            ${magicLink}
        </p>
        
        <div style="border-top: 1px solid #e0e0e0; margin-top: 30px; padding-top: 20px;">
            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                ※ このリンクの有効期限は15分です。
            </p>
            <p style="color: #999; font-size: 12px; margin: 5px 0;">
                ※ このメールに心当たりがない場合は、無視していただいて構いません。
            </p>
        </div>
    </div>
    
    <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #999; font-size: 12px; margin: 5px 0;">
            Karte AI+ - 電子カルテ作成をAIで効率化
        </p>
    </div>
</body>
</html>
`;

        const allowFakeSuccess = String(process.env.ALLOW_FAKE_EMAIL_SUCCESS || '').toLowerCase() === 'true';
        const returnMagicLink = String(process.env.RETURN_MAGIC_LINK || '').toLowerCase() === 'true';

        // 開発用フォールバック（特定のアカウントのみ優先実行）
        // Only run fake success (skip email) if:
        // 1. It's a pure debug account (ux_test_...)
        // 2. OR explicit debug flags are passed (debug_seed/reset)
        const isPureDebug = email.includes('ux_test_');
        const hasDebugFlags = req.body.debug_seed === true || req.body.debug_reset === true;

        // Debug mode is triggered only if allowFakeSuccess is on AND (it's a debug email OR flags are present)
        // This ensures 'super206cc' gets a REAL EMAIL during normal login, but can still be reset via curl with flags.
        if (allowFakeSuccess && (isPureDebug || hasDebugFlags)) {
            const shouldSeed = req.body.debug_seed === true;
            const shouldReset = req.body.debug_reset === true;

            context.log.warn(`[auth-send-magic-link] Debug Mode active. Email: ${email}, Skip email. Flags: seed=${shouldSeed}, reset=${shouldReset}`);

            // Generate SESSION TOKEN directly to bypass auth-verify-token crash
            const sessionToken = jwt.sign({ email, type: 'session' }, secret, { expiresIn: '14d' });

            const { upsertSubscription } = require('../lib/table');

            if (shouldReset) {
                // FORCE UNSUBSCRIBE (for testing "Buy")
                try {
                    await upsertSubscription(email, {
                        subscriptionId: 'sub_debug_canceled_' + Date.now(),
                        status: 'canceled',
                        currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
                        planId: 'price_dummy',
                        canceledAt: new Date().toISOString()
                    });
                    context.log.warn(`[auth-send-magic-link] FORCED RESET (Canceled) for ${email}`);
                } catch (e) { context.log.error("Reset failed", e); }

            } else if (shouldSeed) {
                // FORCE SUBSCRIBE (for testing "Cancel")
                try {
                    await upsertSubscription(email, {
                        subscriptionId: 'sub_debug_dummy_' + Date.now(),
                        status: 'active',
                        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
                        planId: 'price_dummy',
                        createdAt: new Date().toISOString()
                    });
                    context.log.warn(`[auth-send-magic-link] Seeded dummy subscription for ${email}`);
                } catch (seedErr) {
                    context.log.error(`[auth-send-magic-link] Failed to seed dummy subscription: ${seedErr.message}`);
                }
            } else {
                context.log.warn(`[auth-send-magic-link] No state change requested (just generating token).`);
            }

            context.res = {
                status: 200,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: Object.assign(
                    { message: "Magic link generated (email send skipped)" },
                    returnMagicLink ? { magicLink, sessionToken } : {}
                )
            };
            return;
        }

        try {
            await sendEmail({ to: email, subject, text, html });
            context.res = {
                status: 200,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: { message: "Magic link sent" }
            };
        } catch (error) {
            context.log.error("[auth-send-magic-link] Failed to send email:", error);
            // Fallback removed from catch since it's now prioritized
            throw error;
        }
    } catch (criticalError) {
        context.log.error("[auth-send-magic-link] Critical Startup Error:", criticalError);
        context.res = {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: {
                error: "Critical Server Error",
                details: criticalError.message
            }
        };
    }
};
