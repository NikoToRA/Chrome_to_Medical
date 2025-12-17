const emailService = require('../utils/email');
const { getSubscription } = require('../lib/table');

module.exports = async function (context, req) {
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        };
        return;
    }

    const { email } = req.body || {};

    if (!email) {
        context.res = {
            status: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: { error: "メールアドレスが必要です。" }
        };
        return;
    }

    context.log(`[SendPortalLink] Request for: ${email}`);

    try {
        // 1. Check if subscription exists
        const sub = await getSubscription(email);

        if (!sub || !sub.stripeCustomerId) {
            // Security: Don't reveal if email exists or not, just say "If registered, email sent"
            // But for UX, maybe we should just return success regardless?
            // "入力されたメールアドレスが登録されている場合、管理用リンクを送信しました。"
            context.log(`[SendPortalLink] No subscription found for ${email}`);
        } else {
            // 2. Generate and Send Email
            // We use emailService.sendPortalAccessEmail which we will create next.
            // It handles portal link generation internally.
            await emailService.sendPortalAccessEmail(email, sub.name);
            context.log(`[SendPortalLink] Email sent to ${email}`);
        }

        context.res = {
            status: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: { message: "入力されたメールアドレスが登録されている場合、管理用リンクを送信しました。" }
        };

    } catch (error) {
        context.log.error('[SendPortalLink] Error:', error);
        context.res = {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: { error: "サーバーエラーが発生しました。" }
        };
    }
};
