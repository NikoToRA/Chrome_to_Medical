/**
 * ユーザーステータス確認スクリプト
 * Stripeの顧客とDBの状態を比較
 */

const fs = require('fs');
try {
    const settings = JSON.parse(fs.readFileSync('local.settings.json', 'utf8'));
    if (settings.Values) {
        Object.assign(process.env, settings.Values);
    }
} catch (e) {
    console.log('local.settings.json not found');
}

const Stripe = require('stripe');
const { getSubscription } = require('./lib/table');

// 確認対象のメールアドレス
const targetEmails = [
    'kasai.yokoyama.naika@gmail.com',
    'r.ohsawa@cocoromi-cl.jp',
    'm.nakano@icloud.com',
    'drkurukuru@gmail.com',
    'ogikuboshonika@gmail.com',
    'claude198510@gmail.com',
    'colabmaking99@gmail.com',
    'nikotora99@gmail.com'
];

async function main() {
    console.log('=== ユーザーステータス確認 ===\n');

    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

    for (const email of targetEmails) {
        console.log(`\n--- ${email} ---`);

        // 1. DBの状態を確認
        try {
            const dbSub = await getSubscription(email);
            if (dbSub) {
                console.log('  [DB] 存在する');
                console.log(`    Status: ${dbSub.status}`);
                console.log(`    TrialEnd: ${dbSub.trialEnd || 'N/A'}`);
                console.log(`    PeriodEnd: ${dbSub.currentPeriodEnd || 'N/A'}`);

                // Active判定
                const now = new Date();
                const periodEnd = dbSub.currentPeriodEnd ? new Date(dbSub.currentPeriodEnd) : null;
                const trialEnd = dbSub.trialEnd ? new Date(dbSub.trialEnd) : null;

                let isActive = false;
                if (dbSub.status === 'active') {
                    isActive = periodEnd && periodEnd > now;
                } else if (dbSub.status === 'trialing') {
                    isActive = trialEnd ? trialEnd > now : (periodEnd && periodEnd > now);
                } else if (dbSub.status === 'canceled') {
                    isActive = periodEnd && periodEnd > now;
                }

                console.log(`    → Active判定: ${isActive ? '✅ 利用可能' : '❌ 利用不可'}`);
            } else {
                console.log('  [DB] ❌ 存在しない（ログイン不可の可能性）');
            }
        } catch (e) {
            console.log(`  [DB] Error: ${e.message}`);
        }

        // 2. Stripeの状態を確認
        try {
            const customers = await stripe.customers.list({ email: email, limit: 1 });
            if (customers.data.length > 0) {
                const customer = customers.data[0];
                console.log('  [Stripe] Customer存在');

                const subscriptions = await stripe.subscriptions.list({
                    customer: customer.id,
                    limit: 5,
                    status: 'all'
                });

                if (subscriptions.data.length > 0) {
                    console.log(`    Subscriptions: ${subscriptions.data.length}件`);
                    subscriptions.data.forEach((sub, i) => {
                        const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : 'N/A';
                        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
                        console.log(`    [${i+1}] Status: ${sub.status}, TrialEnd: ${trialEnd}, PeriodEnd: ${periodEnd}`);
                    });
                } else {
                    console.log('    Subscriptions: 0件（顧客のみ、サブスクリプションなし）');
                }
            } else {
                console.log('  [Stripe] Customer存在しない');
            }
        } catch (e) {
            console.log(`  [Stripe] Error: ${e.message}`);
        }
    }

    console.log('\n=== 確認完了 ===');
}

main();
