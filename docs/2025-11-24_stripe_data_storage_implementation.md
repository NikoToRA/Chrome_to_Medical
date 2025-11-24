# Stripeデータ保存機能実装ログ

**日付**: 2025-11-24  
**ブランチ**: `feature/auth-magic-link-registration`  
**コミット**: `cbaf88a`

## 概要

Azure FunctionsにStripeの決済データをAzure Table Storageに保存する機能を実装しました。これにより、サブスクリプション情報、顧客情報、決済履歴を詳細に管理できるようになりました。

## 実装内容

### 1. テーブル操作関数の追加 (`azure-functions/lib/table.js`)

以下の新しい関数を追加：

#### `upsertStripeSubscription(stripeSubscriptionId, data)`
- **用途**: StripeサブスクリプションIDベースで詳細情報を保存
- **テーブル**: `StripeSubscriptions`
- **PartitionKey**: `StripeSubscription`
- **RowKey**: StripeサブスクリプションID

#### `getStripeSubscription(stripeSubscriptionId)`
- **用途**: StripeサブスクリプションIDで情報を取得

#### `upsertStripeCustomer(customerId, data)`
- **用途**: Stripe顧客情報を保存
- **テーブル**: `StripeCustomers`
- **PartitionKey**: `StripeCustomer`
- **RowKey**: Stripe顧客ID

#### `getStripeCustomer(customerId)`
- **用途**: Stripe顧客IDで情報を取得

#### `insertPaymentHistory(paymentIntentId, data)`
- **用途**: 決済履歴を保存
- **テーブル**: `PaymentHistory`
- **PartitionKey**: 日付（YYYY-MM-DD形式）
- **RowKey**: Payment Intent ID

#### `upsertSubscription(email, data)` の改善
- `updatedAt` フィールドを追加
- 戻り値を返すように変更

### 2. Webhook処理の拡張 (`azure-functions/stripe-webhook/index.js`)

#### `checkout.session.completed` イベント
- サブスクリプション情報をStripe APIから取得
- 詳細情報（プラン、金額、期間など）を保存
- 顧客情報を保存
- emailベースのサブスクリプション状態を更新

#### `customer.subscription.updated` / `customer.subscription.deleted` イベント
- サブスクリプション状態の更新
- キャンセル情報の保存
- 顧客情報の更新

#### `payment_intent.succeeded` / `payment_intent.payment_failed` イベント
- 決済履歴の保存
- 決済成功/失敗の記録

#### `invoice.payment_succeeded` / `invoice.payment_failed` イベント
- 請求書イベントのログ記録（将来の拡張用）

### 3. テーブル作成スクリプト (`scripts/create-stripe-tables.sh`)

Azure CLIを使用して必要なテーブルを一括作成するスクリプトを追加。

**作成されるテーブル**:
- `Subscriptions`
- `StripeSubscriptions`
- `StripeCustomers`
- `PaymentHistory`
- `Users`（既存）
- `LogMetadata`（既存）

**実行方法**:
```bash
./scripts/create-stripe-tables.sh
```

**実行結果**: ✅ 全6テーブルの作成に成功

### 4. ドキュメント作成 (`docs/STRIPE_DATA_STORAGE.md`)

Stripeデータ保存機能の詳細ドキュメントを作成：

- データ構造の説明
- 各テーブルのフィールド定義
- Webhookイベント処理の説明
- テーブル作成方法
- データ確認方法
- 使用例
- トラブルシューティング

## データ構造

### Subscriptions テーブル
- **用途**: メールアドレスベースでサブスクリプション状態を管理
- **PartitionKey**: `Subscription`
- **RowKey**: メールアドレスのBase64エンコード
- **主要フィールド**: `email`, `status`, `stripeCustomerId`, `stripeSubscriptionId`, `currentPeriodEnd`, `planId`, `planName`

### StripeSubscriptions テーブル
- **用途**: StripeサブスクリプションIDベースで詳細情報を管理
- **PartitionKey**: `StripeSubscription`
- **RowKey**: StripeサブスクリプションID
- **主要フィールド**: `subscriptionId`, `customerId`, `email`, `status`, `currentPeriodStart`, `currentPeriodEnd`, `planId`, `planName`, `amount`, `currency`

### StripeCustomers テーブル
- **用途**: Stripe顧客情報を管理
- **PartitionKey**: `StripeCustomer`
- **RowKey**: Stripe顧客ID
- **主要フィールド**: `customerId`, `email`, `name`, `created`, `metadata`

### PaymentHistory テーブル
- **用途**: 決済履歴を保存
- **PartitionKey**: 日付（YYYY-MM-DD形式）
- **RowKey**: Payment Intent ID
- **主要フィールド**: `paymentIntentId`, `customerId`, `email`, `amount`, `currency`, `status`, `paymentMethod`

## 変更ファイル

1. `azure-functions/lib/table.js` - テーブル操作関数の追加・改善
2. `azure-functions/stripe-webhook/index.js` - Webhook処理の拡張
3. `scripts/create-stripe-tables.sh` - テーブル作成スクリプト（新規）
4. `docs/STRIPE_DATA_STORAGE.md` - ドキュメント（新規）

## テスト状況

- ✅ Azure Storage Account接続確認
- ✅ テーブル作成スクリプト実行成功
- ✅ コードのリントエラーなし
- ⏳ Webhookイベントの実際の動作確認は未実施（Stripe Dashboardからのテスト送信が必要）

## 次のステップ

1. Stripe DashboardでWebhookエンドポイントを設定
2. テスト決済を実行してデータ保存を確認
3. Azure Portalでテーブルデータを確認
4. 必要に応じて追加のWebhookイベント処理を実装

## 関連ドキュメント

- `docs/STRIPE_CONFIGURATION.md` - Stripe設定ガイド
- `docs/DEPLOYMENT_GUIDE.md` - デプロイメントガイド
- `docs/STRIPE_DATA_STORAGE.md` - Stripeデータ保存詳細ガイド

## コミット情報

```
commit cbaf88a
Author: [User]
Date: 2025-11-24

feat: Stripeデータ保存機能を実装

- StripeSubscriptionsテーブル: サブスクリプション詳細情報を保存
- StripeCustomersテーブル: 顧客情報を保存
- PaymentHistoryテーブル: 決済履歴を保存
- stripe-webhookを拡張して詳細なStripeデータを保存
- create-stripe-tables.shスクリプトを追加（Azure CLIでテーブル作成）
- STRIPE_DATA_STORAGE.mdドキュメントを追加
```
