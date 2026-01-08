/**
 * Stripe同期バッチ処理
 *
 * 1日1回（毎日AM3:00 UTC = 正午 JST）実行
 * Webhookの失敗をカバーし、DBを最新のStripe情報で更新
 *
 * 課金ユーザー/トライアル延長ユーザーに不利益がないよう、
 * DBを常に最新化する
 */

const Stripe = require('stripe');
const { upsertSubscription, getSubscription } = require('../lib/table');

module.exports = async function (context, myTimer) {
    const timeStamp = new Date().toISOString();
    context.log('[SyncStripe] Function started at:', timeStamp);

    if (!process.env.STRIPE_SECRET_KEY) {
        context.log.error('[SyncStripe] STRIPE_SECRET_KEY is not set');
        return;
    }

    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

    let syncedCount = 0;
    let errorCount = 0;
    let totalProcessed = 0;

    try {
        // Stripeから全サブスクリプションを取得（ページネーション対応）
        let hasMore = true;
        let startingAfter = undefined;

        while (hasMore) {
            const params = {
                limit: 100,
                status: 'all', // trialing, active, canceled等すべて取得
                expand: ['data.customer']
            };

            if (startingAfter) {
                params.starting_after = startingAfter;
            }

            const subscriptions = await stripe.subscriptions.list(params);

            for (const subscription of subscriptions.data) {
                totalProcessed++;

                try {
                    // カスタマーのメールアドレスを取得
                    const customer = subscription.customer;
                    const email = typeof customer === 'object' ? customer.email : null;

                    if (!email) {
                        context.log.warn('[SyncStripe] No email for subscription:', subscription.id);
                        continue;
                    }

                    // DBの情報を取得
                    const existingSub = await getSubscription(email);

                    // Stripeの情報でDBを更新
                    const updateData = {
                        status: subscription.status,
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
                        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
                        stripeSubscriptionId: subscription.id,
                        stripeCustomerId: typeof customer === 'object' ? customer.id : customer,
                        lastSyncedAt: new Date().toISOString()
                    };

                    // trial_endがある場合は保存
                    if (subscription.trial_end) {
                        updateData.trialEnd = new Date(subscription.trial_end * 1000).toISOString();
                    }

                    // canceled_atがある場合は保存
                    if (subscription.canceled_at) {
                        updateData.canceledAt = new Date(subscription.canceled_at * 1000).toISOString();
                    }

                    await upsertSubscription(email, updateData);

                    // 更新があったかログ出力
                    const wasChanged = !existingSub ||
                        existingSub.status !== updateData.status ||
                        existingSub.trialEnd !== updateData.trialEnd;

                    if (wasChanged) {
                        context.log('[SyncStripe] Updated:', email, 'Status:', updateData.status, 'TrialEnd:', updateData.trialEnd);
                    }

                    syncedCount++;

                } catch (subError) {
                    context.log.error('[SyncStripe] Error processing subscription:', subscription.id, subError.message);
                    errorCount++;
                }
            }

            // ページネーション
            hasMore = subscriptions.has_more;
            if (hasMore && subscriptions.data.length > 0) {
                startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
            }
        }

        context.log('[SyncStripe] Completed. Total:', totalProcessed, 'Synced:', syncedCount, 'Errors:', errorCount);

    } catch (error) {
        context.log.error('[SyncStripe] Critical error:', error.message);
        throw error;
    }
};
