/**
 * 緊急修正スクリプト: 14日過ぎてログインできないユーザーを修正
 *
 * Stripeから最新のサブスクリプション情報を取得し、DBを更新
 *
 * 使い方:
 *   cd azure-functions
 *   node fix_trial_users.js
 *
 * 環境変数が必要:
 *   - STRIPE_SECRET_KEY
 *   - AZURE_STORAGE_CONNECTION_STRING
 */

// local.settings.jsonから環境変数を読み込む
const fs = require('fs');
try {
    const settings = JSON.parse(fs.readFileSync('local.settings.json', 'utf8'));
    if (settings.Values) {
        Object.assign(process.env, settings.Values);
    }
} catch (e) {
    console.log('local.settings.json not found, using environment variables');
}

const Stripe = require('stripe');
const { upsertSubscription, getSubscription } = require('./lib/table');

async function main() {
    console.log('=== Stripe同期スクリプト開始 ===\n');

    if (!process.env.STRIPE_SECRET_KEY) {
        console.error('ERROR: STRIPE_SECRET_KEY が設定されていません');
        process.exit(1);
    }

    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
        console.error('ERROR: AZURE_STORAGE_CONNECTION_STRING が設定されていません');
        process.exit(1);
    }

    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

    let syncedCount = 0;
    let errorCount = 0;
    let totalProcessed = 0;
    const updatedUsers = [];

    try {
        // Stripeから全サブスクリプションを取得
        let hasMore = true;
        let startingAfter = undefined;

        while (hasMore) {
            const params = {
                limit: 100,
                status: 'all',
                expand: ['data.customer']
            };

            if (startingAfter) {
                params.starting_after = startingAfter;
            }

            console.log('Stripeからサブスクリプションを取得中...');
            const subscriptions = await stripe.subscriptions.list(params);

            for (const subscription of subscriptions.data) {
                totalProcessed++;

                try {
                    const customer = subscription.customer;
                    const email = typeof customer === 'object' ? customer.email : null;

                    if (!email) {
                        console.log(`  [SKIP] No email for subscription: ${subscription.id}`);
                        continue;
                    }

                    // 現在のDB情報を取得
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

                    if (subscription.trial_end) {
                        updateData.trialEnd = new Date(subscription.trial_end * 1000).toISOString();
                    }

                    if (subscription.canceled_at) {
                        updateData.canceledAt = new Date(subscription.canceled_at * 1000).toISOString();
                    }

                    await upsertSubscription(email, updateData);

                    // 変更があったかチェック
                    const wasChanged = !existingSub ||
                        existingSub.status !== updateData.status ||
                        existingSub.trialEnd !== updateData.trialEnd ||
                        existingSub.currentPeriodEnd !== updateData.currentPeriodEnd;

                    if (wasChanged) {
                        console.log(`  [UPDATED] ${email}`);
                        console.log(`    Status: ${existingSub?.status || 'N/A'} → ${updateData.status}`);
                        console.log(`    TrialEnd: ${existingSub?.trialEnd || 'N/A'} → ${updateData.trialEnd || 'N/A'}`);
                        console.log(`    PeriodEnd: ${existingSub?.currentPeriodEnd || 'N/A'} → ${updateData.currentPeriodEnd}`);
                        updatedUsers.push({
                            email,
                            oldStatus: existingSub?.status,
                            newStatus: updateData.status,
                            trialEnd: updateData.trialEnd
                        });
                    } else {
                        console.log(`  [OK] ${email} (変更なし)`);
                    }

                    syncedCount++;

                } catch (subError) {
                    console.error(`  [ERROR] subscription ${subscription.id}: ${subError.message}`);
                    errorCount++;
                }
            }

            hasMore = subscriptions.has_more;
            if (hasMore && subscriptions.data.length > 0) {
                startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
            }
        }

        console.log('\n=== 同期完了 ===');
        console.log(`処理件数: ${totalProcessed}`);
        console.log(`同期成功: ${syncedCount}`);
        console.log(`エラー: ${errorCount}`);
        console.log(`更新されたユーザー: ${updatedUsers.length}`);

        if (updatedUsers.length > 0) {
            console.log('\n--- 更新されたユーザー一覧 ---');
            updatedUsers.forEach(u => {
                console.log(`  ${u.email}: ${u.oldStatus || 'N/A'} → ${u.newStatus} (TrialEnd: ${u.trialEnd || 'N/A'})`);
            });
        }

    } catch (error) {
        console.error('Critical error:', error.message);
        process.exit(1);
    }
}

main();
