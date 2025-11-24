# Stripe設定ガイド

## 概要

Chrome拡張機能「KarteAI+」の販売におけるStripeの設定とシークレットキーの管理方法について説明します。

## アーキテクチャ

### フロー

```
ユーザー（LP）
  ↓
LP（landing-page）→ Azure Functions `/create-checkout-session`
  ↓
Stripe Checkout（決済画面）
  ↓
Stripe Webhook → Azure Functions `/stripe-webhook`
  ↓
Azure Table Storage（サブスクリプション状態保存）
  ↓
拡張機能 → Azure Functions `/check-subscription`
```

## Stripeキーの保存場所

### 1. シークレットキー（Secret Key）

**保存場所**: **Azure Functions の App Settings（環境変数）**

- **本番環境**: Azure Portal → Function App → Configuration → Application settings
- **ローカル開発**: `.env` ファイル（Gitにコミットしない）

**使用箇所**:
- `azure-functions/create-checkout-session/index.js` - Checkoutセッション作成
- `azure-functions/stripe-webhook/index.js` - Webhook検証とサブスクリプション管理

**理由**:
- シークレットキーは**サーバーサイド（Azure Functions）でのみ使用**
- クライアントサイド（LP、拡張機能）には一切送信しない
- Stripeのセキュリティベストプラクティスに準拠

### 2. 公開可能キー（Publishable Key）

**保存場所**: **LP（landing-page）の環境変数**（必要に応じて）

**使用箇所**:
- 現在は使用していない（Checkoutはサーバー側で作成）
- 将来的にStripe Elementsを直接使用する場合は必要

### 3. Webhook Secret

**保存場所**: **Azure Functions の App Settings（環境変数）**

**使用箇所**:
- `azure-functions/stripe-webhook/index.js` - Webhook署名の検証

## 環境変数の設定

### ローカル開発環境

`.env` ファイルを作成（`.env.example`をコピー）：

```bash
cp .env.example .env
```

`.env` ファイルにデモ環境用のキーを設定：

```bash
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PRICE_ID="price_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Azure Functions（本番環境）

Azure Portalで設定：

1. Azure Portal → Function App → `func-karte-ai-1763705952`
2. 「Configuration」→「Application settings」
3. 以下の環境変数を追加：
   - `STRIPE_SECRET_KEY` - Stripe Dashboardから取得（本番用）
   - `STRIPE_PRICE_ID` - Stripe Dashboardから取得（本番用）
   - `STRIPE_WEBHOOK_SECRET` - Stripe DashboardのWebhook設定から取得

または、`scripts/SET_ENV_VARS.sh` を使用：

```bash
# .envファイルに本番環境のキーを設定
# その後実行
./scripts/SET_ENV_VARS.sh
```

## Stripe Dashboardでの設定

### 1. API Keys

**場所**: Stripe Dashboard → Developers → API keys

- **Test mode**: 開発・テスト用
- **Live mode**: 本番環境用

### 2. Products & Prices

**場所**: Stripe Dashboard → Products

- サブスクリプションプランを作成
- Price IDをコピーして `STRIPE_PRICE_ID` に設定

### 3. Webhooks

**場所**: Stripe Dashboard → Developers → Webhooks

**エンドポイントURL**:
```
https://func-karte-ai-1763705952.azurewebsites.net/api/stripe-webhook
```

**イベント**:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

**Webhook Secret**:
- Webhook作成後に表示されるシークレットをコピー
- `STRIPE_WEBHOOK_SECRET` に設定

## セキュリティベストプラクティス

### ✅ 推奨事項

1. **シークレットキーはサーバーサイドのみ**
   - Azure Functionsの環境変数に保存
   - `.env`ファイルは`.gitignore`に追加済み

2. **環境ごとにキーを分離**
   - テスト環境: `sk_test_...`
   - 本番環境: `sk_live_...`

3. **定期的なキーのローテーション**
   - Stripe Dashboardで新しいキーを生成
   - Azure Functionsの環境変数を更新

### ❌ 避けるべきこと

1. **クライアントサイドにシークレットキーを含めない**
   - LP（landing-page）のコードに含めない
   - 拡張機能のコードに含めない
   - GitHubにコミットしない

2. **公開リポジトリにコミットしない**
   - `.env`ファイルは`.gitignore`に追加済み
   - シークレットキーを含むファイルはコミットしない

## トラブルシューティング

### Webhookが動作しない

1. Azure Functionsのログを確認
2. Stripe DashboardのWebhookイベントログを確認
3. `STRIPE_WEBHOOK_SECRET`が正しいか確認

### Checkoutセッションが作成できない

1. `STRIPE_SECRET_KEY`が正しいか確認
2. `STRIPE_PRICE_ID`が存在するか確認
3. Azure Functionsのログを確認

### サブスクリプション状態が更新されない

1. Webhookが正しく設定されているか確認
2. Azure Table Storageにデータが保存されているか確認
3. `check-subscription`のログを確認
