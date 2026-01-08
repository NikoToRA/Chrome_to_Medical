/**
 * Stripe同期 + トライアル警告バッチ処理
 *
 * 1日1回（毎日AM0:00 UTC = 朝9:00 JST）実行
 *
 * 処理内容:
 * 1. Stripeから全サブスクリプションを同期（DBを最新化）
 * 2. trialEnd が2日後のユーザーに警告メールを送信
 */

const Stripe = require('stripe');
const { upsertSubscription, getSubscription, getSubscriptionsByTrialEndRange } = require('../lib/table');
const { addDays, startOfDay, endOfDay, format } = require('date-fns');

module.exports = async function (context, myTimer) {
    const timeStamp = new Date().toISOString();
    context.log('[SyncStripe] Function started at:', timeStamp);

    if (!process.env.STRIPE_SECRET_KEY) {
        context.log.error('[SyncStripe] STRIPE_SECRET_KEY is not set');
        return;
    }

    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

    // ========================================
    // PHASE 1: Stripe同期
    // ========================================
    context.log('[SyncStripe] === PHASE 1: Stripe Sync ===');

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

        context.log('[SyncStripe] Phase 1 Completed. Total:', totalProcessed, 'Synced:', syncedCount, 'Errors:', errorCount);

    } catch (error) {
        context.log.error('[SyncStripe] Critical error in Phase 1:', error.message);
        // Phase 1でエラーが起きてもPhase 2は試みる
    }

    // ========================================
    // PHASE 2: トライアル警告メール送信
    // ========================================
    context.log('[SyncStripe] === PHASE 2: Trial Warning Emails ===');

    let warningsSent = 0;
    let warningsSkipped = 0;
    let warningsError = 0;

    try {
        // 遅延ロード（メール送信が必要な時だけ）
        const emailService = require('../utils/email');

        const today = new Date();
        const warningDate = addDays(today, 2);
        const startOfWarningDay = startOfDay(warningDate).toISOString();
        const endOfWarningDay = endOfDay(warningDate).toISOString();

        context.log(`[SyncStripe] Checking trials ending between: ${startOfWarningDay} and ${endOfWarningDay}`);

        // trialEnd が 2日後のサブスクリプションを取得
        const subscriptionsToWarn = await getSubscriptionsByTrialEndRange(startOfWarningDay, endOfWarningDay);

        if (!subscriptionsToWarn || subscriptionsToWarn.length === 0) {
            context.log('[SyncStripe] No subscriptions need trial warning');
        } else {
            context.log(`[SyncStripe] Found ${subscriptionsToWarn.length} subscription(s) for trial warning`);

            for (const sub of subscriptionsToWarn) {
                // 既に警告送信済みならスキップ
                if (sub.trialWarningSent) {
                    context.log(`[SyncStripe] Trial warning already sent to ${sub.email}`);
                    warningsSkipped++;
                    continue;
                }

                try {
                    // trialEnd日付をフォーマット
                    const trialEndDate = new Date(sub.trialEnd);
                    const formattedEndDate = format(trialEndDate, 'yyyy年M月d日');

                    await emailService.sendTrialWarningEmail(sub.email, null, formattedEndDate);

                    // 送信済みフラグを更新
                    await upsertSubscription(sub.email, {
                        trialWarningSent: true,
                        trialWarningSentAt: new Date().toISOString()
                    });

                    context.log(`[SyncStripe] Trial warning sent to ${sub.email}`);
                    warningsSent++;

                } catch (emailError) {
                    context.log.error(`[SyncStripe] Failed to send trial warning to ${sub.email}:`, emailError.message);
                    warningsError++;
                }
            }
        }

        context.log('[SyncStripe] Phase 2 Completed. Sent:', warningsSent, 'Skipped:', warningsSkipped, 'Errors:', warningsError);

    } catch (error) {
        context.log.error('[SyncStripe] Critical error in Phase 2:', error.message);
    }

    // ========================================
    // 完了サマリー
    // ========================================
    context.log('[SyncStripe] === BATCH COMPLETED ===');
    context.log('[SyncStripe] Sync: Total=' + totalProcessed + ', Synced=' + syncedCount + ', Errors=' + errorCount);
    context.log('[SyncStripe] Warnings: Sent=' + warningsSent + ', Skipped=' + warningsSkipped + ', Errors=' + warningsError);
};
