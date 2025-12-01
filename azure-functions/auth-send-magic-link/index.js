const jwt = require('jsonwebtoken');
const { sendEmail } = require('../lib/email');

const secret = process.env.JWT_SECRET;

module.exports = async function (context, req) {
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
    // Need the function app URL.
    // In Azure, it's usually https://<app>.azurewebsites.net
    // We can get it from headers or env.
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

    try {
        await sendEmail({ to: email, subject, text, html });
        context.res = {
            status: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: { message: "Magic link sent" }
        };
    } catch (error) {
        context.log.error("[auth-send-magic-link] Failed to send email:", error);
        context.res = {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: "Failed to send email"
        };
    }
};
