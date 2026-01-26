const { getSubscription } = require('../lib/table');

module.exports = async function (context, req) {
    context.log('Check Subscription processed a request.');

    if (req.method === 'OPTIONS') {
        context.res = { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } };
        return;
    }

    const { email } = req.body;

    if (!email) {
        context.res = { status: 400, body: "Email is required" };
        return;
    }

    context.log('[CheckSubscription] Processing for email:', email);

    try {
        // Default values
        let status = 'inactive';
        let expiry = null;
        let isActive = false;
        let canceledAt = null;
        let cancelAtPeriodEnd = false;
        let trialEnd = null;
        let trialDaysRemaining = null;

        // DBからサブスクリプション情報を取得
        // ※DBはWebhook + 1日1回バッチ同期で最新化される
        let sub = null;
        try {
            sub = await getSubscription(email);
        } catch (dbError) {
            context.log.error('[CheckSubscription] Database Error:', dbError);
        }

        const now = new Date();

        if (sub) {
            status = sub.status || 'inactive';
            expiry = sub.currentPeriodEnd;
            canceledAt = sub.canceledAt || null;
            cancelAtPeriodEnd = sub.cancelAtPeriodEnd || false;
            trialEnd = sub.trialEnd || null;

            const periodEnd = expiry ? new Date(expiry) : null;
            const trialEndDate = trialEnd ? new Date(trialEnd) : null;

            // Active判定ロジック:
            // A: トライアル中（trial_end未来、status=trialing）→ 継続利用OK
            // B: トライアル終了・未課金（trial_end過去、status=trialing）→ ログアウト
            // C: 課金中（status=active）→ 継続利用OK
            // D: キャンセル予約・猶予期間中（status=canceled、currentPeriodEnd未来）→ 継続利用OK
            // E: 完全終了（status=canceled、currentPeriodEnd過去）→ ログアウト
            // F: 決済失敗・リトライ中（status=past_due、currentPeriodEnd未来）→ 猶予期間として継続利用OK

            if (status === 'active') {
                // C: 課金中は常にOK
                isActive = periodEnd && periodEnd > now;
            } else if (status === 'trialing') {
                // A/B: トライアル中はtrialEndで判定
                if (trialEndDate) {
                    isActive = trialEndDate > now;
                    if (trialEndDate > now) {
                        trialDaysRemaining = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));
                    }
                } else {
                    // trialEndがない場合はcurrentPeriodEndで判定（後方互換）
                    isActive = periodEnd && periodEnd > now;
                    context.log('[CheckSubscription] trialEnd not found, using currentPeriodEnd');
                }
            } else if (status === 'canceled' || status === 'past_due') {
                // D/E/F: キャンセル済み・決済失敗はcurrentPeriodEndで判定（猶予期間）
                // past_due: Stripeがリトライ中。periodEndまでは猶予期間として利用可能
                isActive = periodEnd && periodEnd > now;
                if (status === 'past_due') {
                    context.log('[CheckSubscription] Payment past_due, grace period until:', periodEnd);
                }
            } else {
                isActive = false;
            }
        } else {
            context.log('[CheckSubscription] No subscription found for:', email);
        }

        context.res = {
            status: 200, // Always 200 to prevent JSON parse errors on frontend
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                active: isActive,
                hasSubscriptionRecord: !!sub,
                status,
                expiry,
                trialEnd,
                trialDaysRemaining,
                canceledAt,
                cancelAtPeriodEnd
            })
        };
        context.log('[CheckSubscription] Response:', { active: isActive, status, trialEnd });

    } catch (error) {
        context.log.error("[CheckSubscription] Critical Error:", error);
        context.res = {
            status: 200, // Return 200 even on error to pass JSON to frontend
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                active: false,
                error: error.message
            })
        };
    }
}
