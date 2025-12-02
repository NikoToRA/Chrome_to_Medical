# 2025-12-02 リファクタリングとサブスクリプション機能実装ログ

## 概要

本日実施した主要な作業：
1. コードリファクタリング（LP・Azure Functions）
2. Stripeキャンセル時の拡張機能使用制限
3. トライアル警告メールにキャンセルリンク追加

---

## 1. コードリファクタリング

### 実施内容

#### 不要ファイル削除
- `landing-page/PRIVACY_POLICY.md` (重複、privacy/index.htmlに統合)
- `landing-page/TERMS_OF_USE.md` (重複、terms/index.htmlに統合)
- `azure-functions/test-azure-openai.js`
- `azure-functions/test-chat-api.js`
- `azure-functions/test-openai.js`
- `azure-functions/index.js` (空ファイル)

#### コード最適化

**auth-send-magic-link/index.js:**
```javascript
// 削除: SendGrid fallback（未使用）
- const sendgridKey = process.env.SENDGRID_API_KEY;
- let sgMail = null;
- if (sendgridKey) { ... }

// 簡素化: エラーハンドリング
- try { await sendEmail(...); }
- catch (e) { if (sgMail) { ... } }
+ await sendEmail({ to: email, subject, text, html });
```

**auth-verify-token/index.js:**
- 重複HTMLエラーページを `lib/error-pages.js` に共通化
- `createErrorPage()`: 統一されたエラーページ生成関数
- `createTokenDisplayPage()`: トークン表示ページ生成関数

**RegisterPage.jsx:**
```javascript
// 冗長なエラー分岐を削除
- if (err.message && err.message.includes('ネットワークエラー')) { ... }
- else if (err.message && err.message.includes('タイムアウト')) { ... }
- else if (err.status === 500) { ... }
+ setError(err.message || '登録に失敗しました');
```

**SuccessPage.jsx:**
- トークン表示・コピー機能を追加
```javascript
const token = searchParams.get('token');
const copyToken = () => {
  navigator.clipboard.writeText(token).then(() => {
    setCopied(true);
  });
};
```

#### メール重複送信防止
```javascript
// RegisterPage.jsx
- disabled={loading}
+ disabled={loading || success}
```

**コミット:** `361334e` - refactor: コードの整理とエラーページの共通化

---

## 2. Stripeキャンセル時の拡張機能使用制限

### 実装の目的
Stripeでサブスクリプションをキャンセルした場合、即座に拡張機能のAI機能を使用不可にする。

### 実装内容

#### stripe-webhook/index.js
```javascript
case 'checkout.session.completed': {
  // トライアル状態を正確に取得
  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    subscriptionStatus = subscription.status; // 'trialing', 'active', etc.
    currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  }

  await upsertSubscription(email, {
    status: subscriptionStatus,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    currentPeriodEnd: currentPeriodEnd.toISOString(),
    canceledAt: null,
    cancelAtPeriodEnd: false
  });
}

case 'customer.subscription.updated': {
  const updateData = {
    status: subscription.status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false
  };

  if (subscription.canceled_at) {
    updateData.canceledAt = new Date(subscription.canceled_at * 1000).toISOString();
  }
}

case 'customer.subscription.deleted': {
  await upsertSubscription(email, {
    status: 'canceled',
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    canceledAt: new Date(subscription.canceled_at * 1000).toISOString(),
    cancelAtPeriodEnd: false
  });
}
```

**新規フィールド:**
- `stripeSubscriptionId`: Stripe Subscription ID
- `canceledAt`: キャンセル日時
- `cancelAtPeriodEnd`: 期間終了時にキャンセル予約

#### check-subscription/index.js
```javascript
// Active判定ロジック
const now = new Date();
const periodEnd = expiry ? new Date(expiry) : null;

isActive = (
  (status === 'active' || status === 'trialing') &&  // ステータス確認
  periodEnd && periodEnd > now &&                    // 期限内確認
  status !== 'canceled'                               // キャンセル済み除外
);
```

**判定条件:**
- ✅ `status = 'active'` または `'trialing'`
- ✅ `currentPeriodEnd > now` (期限内)
- ✅ `status !== 'canceled'` (キャンセル済みでない)

#### extension/sidepanel/sidepanel.js
```javascript
// AI機能実行前にサブスクリプション確認
async function checkSubscriptionBeforeAI() {
  if (!window.AuthManager) {
    showNotification('認証システムが初期化されていません');
    return false;
  }

  const user = window.AuthManager.getUser();
  if (!user) {
    showNotification('ログインが必要です');
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) {
      loginOverlay.classList.add('active');
    }
    return false;
  }

  try {
    const isSubscribed = await window.AuthManager.checkSubscription();
    if (!isSubscribed) {
      showNotification('有効なサブスクリプションが必要です');
      showSubscriptionOverlay();
      return false;
    }
    return true;
  } catch (error) {
    console.error('[SidePanel] サブスクリプション確認エラー:', error);
    showNotification('サブスクリプション確認に失敗しました');
    return false;
  }
}

// AI機能に適用
async function handleAiChatSend() {
  if (!await checkSubscriptionBeforeAI()) return;
  // ... AI処理
}

async function pasteLatestAssistantMessageDirect() {
  if (!await checkSubscriptionBeforeAI()) return;
  // ... 貼り付け処理
}
```

### 動作フロー

**シナリオA: トライアル期間中（1-14日目）**
```
登録 → status='trialing' → AI機能使用可能
```

**シナリオB: キャンセル実行**
```
Stripeでキャンセル → Webhook受信 → status='canceled'
→ check-subscription: active=false → 拡張機能でAI使用不可
→ 「有効なサブスクリプションが必要です」通知表示
```

**シナリオC: 期限切れ**
```
currentPeriodEnd < now → active=false → AI使用不可
```

**コミット:** `131451d` - feat: Stripeキャンセル時に拡張機能を使用不可にする仕様を実装

---

## 3. トライアル警告メールにキャンセルリンク追加

### 実装の目的
ユーザーが簡単にサブスクリプションをキャンセルできるよう、10日目の警告メールにStripe Customer Portalへのリンクを追加。

### 実装内容

#### create-portal-session API（新規作成）

**function.json:**
```json
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post", "options"],
      "route": "create-portal-session"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

**index.js:**
```javascript
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function (context, req) {
  const { email } = req.body || {};

  // Get user's Stripe customer ID from database
  const subscription = await getSubscription(email);

  // Create Stripe Customer Portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: process.env.LANDING_PAGE_URL || 'https://stkarteai1763705952.z11.web.core.windows.net'
  });

  context.res = {
    status: 200,
    body: { url: session.url }
  };
};
```

**機能:**
- 入力: `{ email: "user@example.com" }`
- 出力: `{ url: "https://billing.stripe.com/p/session_..." }`
- Customer Portalでできること:
  - サブスクリプション解約
  - 支払い方法変更
  - 請求履歴確認
  - 領収書ダウンロード

#### utils/email.js

**Portal URL生成:**
```javascript
async generatePortalUrl(email) {
  try {
    const functionUrl = process.env.FUNCTION_APP_URL || 'https://func-karte-ai-1763705952.azurewebsites.net';
    const response = await fetch(`${functionUrl}/api/create-portal-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      console.error('Failed to create portal session');
      return null;
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error generating portal URL:', error);
    return null;
  }
}
```

**メール送信関数の更新:**
```javascript
async sendTrialWarningEmail(email, userName = null) {
  const displayName = userName || email.split('@')[0];

  // Generate Customer Portal link
  const portalUrl = await this.generatePortalUrl(email);

  const emailContent = {
    senderAddress: this.senderEmail,
    content: {
      subject: "【重要】お試し期間がまもなく終了します",
      plainText: this.getTrialWarningPlainText(displayName, portalUrl),
      html: this.getTrialWarningHtml(displayName, portalUrl)
    },
    recipients: {
      to: [{ address: email, displayName: displayName }]
    }
  };

  // Send email...
}
```

**HTML メールテンプレート:**
```javascript
getTrialWarningHtml(name, portalUrl) {
  const cancelButton = portalUrl
    ? `<div style="text-align: center; margin: 30px 0;">
        <a href="${portalUrl}"
           style="display: inline-block;
                  background-color: #dc3545;
                  color: white;
                  padding: 12px 30px;
                  text-decoration: none;
                  border-radius: 5px;
                  font-weight: bold;">
          サブスクリプションをキャンセル
        </a>
      </div>`
    : '';

  return `
    <div class="warning">
      <strong>【重要】お試し期間がまもなく終了します</strong>
      <p>お試し期間（2週間）がまもなく終了いたします。<br>
      現在、登録から10日が経過しており、あと4日でお試し期間が終了いたします。</p>
    </div>

    <p>このままご利用を継続される場合、お試し期間終了後、自動的に有料プランへ移行いたします。</p>

    ${cancelButton}

    <p style="font-size: 14px; color: #666; text-align: center;">
      継続を希望されない場合は、上記ボタンからサブスクリプションをキャンセルしてください。
    </p>
  `;
}
```

**Plain Text メールテンプレート:**
```javascript
getTrialWarningPlainText(name, portalUrl) {
  const cancelSection = portalUrl
    ? `\n\n継続を希望されない場合は、以下のリンクからキャンセルしてください：\n${portalUrl}\n`
    : '\n\n継続を希望されない場合は、サポートまでお問い合わせください。\n';

  return `${name} 様

この度は、Karte AI Plusをご利用いただき、誠にありがとうございます。

お試し期間（2週間）がまもなく終了いたします。
現在、登録から10日が経過しており、あと4日でお試し期間が終了いたします。

このままご利用を継続される場合、お試し期間終了後、自動的に有料プランへ移行いたします。
${cancelSection}
ご不明な点がございましたら、お気軽にお問い合わせください。
`;
}
```

### ユーザー体験

**登録から10日目:**
1. トライアル警告メール受信
2. メール内容:
   - 「あと4日で有料プランへ移行」
   - 赤色の「サブスクリプションをキャンセル」ボタン
3. ボタンクリック → Stripe Customer Portalへ遷移
4. Portalでワンクリックでキャンセル可能

**キャンセル後:**
- Stripe Webhook → `status='canceled'`
- 拡張機能でAI機能即座に使用不可
- 課金は発生しない

**コミット:** `1e427ac` - feat: トライアル警告メールにStripeキャンセルリンクを追加

---

## デプロイ情報

### Azure Functions
- デプロイ日時: 2025-12-02
- デプロイ先: `func-karte-ai-1763705952`
- Function数: 10個

**デプロイされたFunction一覧:**
1. `auth-send-magic-link` - Magic Link送信
2. `auth-verify-token` - トークン検証とStripeリダイレクト
3. `chat` - AI会話機能
4. `check-subscription` - サブスクリプション状態確認
5. `check-trial-warning` - トライアル警告メール送信（Timer）
6. `create-checkout-session` - Stripe Checkout作成
7. `create-portal-session` - Stripe Portal URL生成 ★新規
8. `save-log` - ログ保存
9. `send-receipts` - 領収書送信（Timer）
10. `stripe-webhook` - Stripeイベント処理

### コミット履歴
```
1e427ac feat: トライアル警告メールにStripeキャンセルリンクを追加
131451d feat: Stripeキャンセル時に拡張機能を使用不可にする仕様を実装
361334e refactor: コードの整理とエラーページの共通化
fa1549b fix: Magic Link認証とメール送信機能を完全復旧
```

---

## テスト方法

### 1. トライアル期間の動作確認
```bash
# 新規登録
curl -X POST https://func-karte-ai-1763705952.azurewebsites.net/api/auth-send-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User",...}'

# サブスク確認（trialing）
curl -X POST https://func-karte-ai-1763705952.azurewebsites.net/api/check-subscription \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
# 期待: {"active":true,"status":"trialing",...}
```

### 2. キャンセル動作確認
```bash
# Stripeダッシュボードでサブスクリプション削除
# → customer.subscription.deleted webhook発火

# サブスク確認（canceled）
curl -X POST https://func-karte-ai-1763705952.azurewebsites.net/api/check-subscription \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
# 期待: {"active":false,"status":"canceled",...}
```

### 3. Customer Portal URL生成確認
```bash
curl -X POST https://func-karte-ai-1763705952.azurewebsites.net/api/create-portal-session \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
# 期待: {"url":"https://billing.stripe.com/p/session_..."}
```

---

## 技術的な変更点まとめ

### 新規作成ファイル
- `azure-functions/lib/error-pages.js` - エラーページテンプレート
- `azure-functions/create-portal-session/function.json` - Portal API設定
- `azure-functions/create-portal-session/index.js` - Portal API実装

### 主要修正ファイル
- `azure-functions/stripe-webhook/index.js` - キャンセル処理追加
- `azure-functions/check-subscription/index.js` - Active判定強化
- `azure-functions/utils/email.js` - Portal URL生成・メールテンプレート更新
- `extension/sidepanel/sidepanel.js` - AI機能実行前のサブスク確認
- `landing-page/src/pages/RegisterPage.jsx` - 重複送信防止
- `landing-page/src/pages/SuccessPage.jsx` - トークン表示機能

### 削除ファイル
- テストファイル: `test-*.js` (3個)
- 重複ドキュメント: `PRIVACY_POLICY.md`, `TERMS_OF_USE.md`
- 空ファイル: `azure-functions/index.js`

---

## 今後の改善案

### 機能面
1. **キャンセル理由の収集**: Customer Portal経由でキャンセル理由をアンケート
2. **再登録フロー**: キャンセル後の再登録を簡単にする
3. **プラン変更**: 月額プランと年間プランの切り替え

### 技術面
1. **エラーハンドリング強化**: Portal URL生成失敗時のフォールバック
2. **キャッシュ戦略**: サブスクリプション状態のキャッシュ（過度なAPI呼び出し防止）
3. **監視強化**: Application Insightsでのサブスク状態変化の追跡

---

## 参考リンク

- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Azure Communication Services](https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/email/send-email)

---

最終更新: 2025-12-02 08:30 JST
作業者: Claude Code
