# Stripeデータ保存ガイド

## 概要

Azure FunctionsでStripeの決済データをAzure Table Storageに保存する機能の説明です。

## データ構造

### 1. Subscriptions テーブル

**用途**: メールアドレスベースでサブスクリプション状態を管理

**PartitionKey**: `Subscription`
**RowKey**: メールアドレスのBase64エンコード

**フィールド**:
- `email` - メールアドレス
- `status` - サブスクリプション状態 (`active`, `trialing`, `canceled`, `past_due` など)
- `stripeCustomerId` - Stripe顧客ID
- `stripeSubscriptionId` - StripeサブスクリプションID
- `currentPeriodEnd` - 現在の期間終了日時
- `planId` - プランID
- `planName` - プラン名
- `cancelAtPeriodEnd` - 期間終了時にキャンセルするか
- `updatedAt` - 更新日時

### 2. StripeSubscriptions テーブル

**用途**: StripeサブスクリプションIDベースで詳細情報を管理

**PartitionKey**: `StripeSubscription`
**RowKey**: StripeサブスクリプションID

**フィールド**:
- `subscriptionId` - StripeサブスクリプションID
- `customerId` - Stripe顧客ID
- `email` - メールアドレス
- `status` - サブスクリプション状態
- `currentPeriodStart` - 現在の期間開始日時
- `currentPeriodEnd` - 現在の期間終了日時
- `cancelAtPeriodEnd` - 期間終了時にキャンセルするか
- `canceledAt` - キャンセル日時
- `planId` - プランID
- `planName` - プラン名
- `amount` - 金額（単位: 最小通貨単位）
- `currency` - 通貨コード
- `trialEnd` - トライアル終了日時
- `updatedAt` - 更新日時

### 3. StripeCustomers テーブル

**用途**: Stripe顧客情報を管理

**PartitionKey**: `StripeCustomer`
**RowKey**: Stripe顧客ID

**フィールド**:
- `customerId` - Stripe顧客ID
- `email` - メールアドレス
- `name` - 顧客名
- `created` - 作成日時
- `metadata` - メタデータ（JSON形式）
- `updatedAt` - 更新日時

### 4. PaymentHistory テーブル

**用途**: 決済履歴を保存

**PartitionKey**: 日付（YYYY-MM-DD形式）
**RowKey**: Payment Intent ID

**フィールド**:
- `paymentIntentId` - Payment Intent ID
- `customerId` - Stripe顧客ID
- `email` - メールアドレス
- `amount` - 金額（単位: 最小通貨単位）
- `currency` - 通貨コード
- `status` - 決済状態 (`succeeded`, `failed` など)
- `paymentMethod` - 決済方法ID
- `createdAt` - 作成日時

## Webhookイベント処理

### 処理されるイベント

1. **checkout.session.completed**
   - Checkout完了時に発火
   - サブスクリプション情報、顧客情報を保存

2. **customer.subscription.updated**
   - サブスクリプション更新時に発火
   - サブスクリプション状態を更新

3. **customer.subscription.deleted**
   - サブスクリプション削除時に発火
   - サブスクリプション状態を更新

4. **payment_intent.succeeded**
   - 決済成功時に発火
   - 決済履歴を保存

5. **payment_intent.payment_failed**
   - 決済失敗時に発火
   - 決済履歴を保存

6. **invoice.payment_succeeded**
   - 請求書の支払い成功時に発火
   - ログ記録（必要に応じて拡張可能）

7. **invoice.payment_failed**
   - 請求書の支払い失敗時に発火
   - ログ記録（必要に応じて拡張可能）

## テーブルの作成

### Azure CLIを使用

```bash
./scripts/create-stripe-tables.sh
```

このスクリプトは以下のテーブルを作成します：
- `Subscriptions`
- `StripeSubscriptions`
- `StripeCustomers`
- `PaymentHistory`
- `Users`（既存）
- `LogMetadata`（既存）

### 手動で作成

Azure Portalから：
1. Azure Portal → Storage Account → `stkarteai1763705952`
2. 「Tables」→「+ Table」
3. テーブル名を入力して作成

## データの確認

### Azure Portalから確認

1. Azure Portal → Storage Account → `stkarteai1763705952`
2. 「Tables」を選択
3. テーブルを選択してデータを確認

### Azure CLIで確認

```bash
# 接続文字列を取得
az storage account show-connection-string \
    --name stkarteai1763705952 \
    --resource-group rg-karte-ai \
    --query "connectionString" -o tsv

# テーブル一覧を表示
az storage table list \
    --connection-string "<接続文字列>" \
    --output table
```

## 使用例

### サブスクリプション状態の確認

```javascript
const { getSubscription } = require('../lib/table');

const subscription = await getSubscription('user@example.com');
if (subscription && subscription.status === 'active') {
    // アクティブなサブスクリプション
}
```

### Stripeサブスクリプション情報の取得

```javascript
const { getStripeSubscription } = require('../lib/table');

const stripeSub = await getStripeSubscription('sub_xxxxx');
console.log(stripeSub.planName, stripeSub.amount);
```

### 顧客情報の取得

```javascript
const { getStripeCustomer } = require('../lib/table');

const customer = await getStripeCustomer('cus_xxxxx');
console.log(customer.email, customer.name);
```

## トラブルシューティング

### テーブルが作成されない

1. Azure Storage Accountの接続文字列を確認
2. ストレージアカウントへのアクセス権限を確認
3. `scripts/create-stripe-tables.sh` を実行

### Webhookでデータが保存されない

1. Azure Functionsのログを確認
2. Stripe DashboardのWebhookイベントログを確認
3. `STRIPE_WEBHOOK_SECRET`が正しいか確認
4. テーブルが存在するか確認

### データが重複する

- `upsertEntity`を使用しているため、同じRowKeyのデータは更新されます
- 重複を避けるには、RowKeyの設計を確認してください
