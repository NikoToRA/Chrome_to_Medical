# お試し期間警告と領収書発行機能

このドキュメントでは、お試し期間の警告メール送信と領収書発行機能の実装について説明します。

## 機能概要

### 1. お試し期間警告メール送信 (`check-trial-warning`)
- **実行頻度**: 毎日 9:00 AM UTC（日本時間 18:00）
- **機能**: 登録から10日経過したユーザーに「このままだと有料になりますよ」というメールを送信
- **設定**: `config/company.json` の `trialWarningDay` で日数を変更可能（デフォルト: 10日）

### 2. 領収書発行・送信 (`send-receipts`)
- **実行頻度**: 毎日 10:00 AM UTC（日本時間 19:00）、月末のみ実際に処理
- **機能**: 決済日（月末）に領収書をPDF生成してメール送信
- **インボイス制度対応**: 消費税適格事業者番号を含む領収書を生成

## 会社情報

以下の情報が `config/company.json` に設定されています：

- **会社名**: Wonder Drill株式会社
- **代表者**: 代表取締役医師 平山 傑
- **所在地**: 北海道札幌市中央区南5条西15丁目2-3 リズム医大前503号室
- **メールアドレス**: support@wonder-drill.com
- **登録番号（インボイス）**: T4430001092106

## セットアップ

### 1. 依存関係のインストール

```bash
cd azure-functions
npm install
```

新しく追加されたパッケージ:
- `@azure/communication-email`: メール送信
- `pdfkit`: PDF生成
- `date-fns`: 日付処理

### 2. 環境変数の設定

`local.settings.json` に以下の環境変数を追加してください：

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "ACS_CONNECTION_STRING": "your-acs-connection-string",
    "ACS_SENDER_EMAIL": "support@wonder-drill.com",
    "AZURE_STORAGE_CONNECTION_STRING": "your-storage-connection-string"
  }
}
```

**注意**: `ACS_SENDER_EMAIL` は `config/company.json` の `email` フィールドが優先されます。

### 3. データベース実装

`utils/database.js` は Azure Table Storage を使用する実装になっていますが、
実際のデータベース構造に合わせて調整が必要です。

#### 必要なデータ構造

**users テーブル:**
- `partitionKey`: "user"
- `rowKey`: email
- `email`: ユーザーのメールアドレス
- `name` / `userName`: ユーザー名
- `registrationDate`: 登録日 (YYYY-MM-DD形式)
- `subscriptionStatus`: "trial" | "active" | "cancelled"
- `subscriptionAmount`: 月額料金（数値、税込）
- `trialWarningSent`: 警告メール送信済みフラグ（boolean）
- `trialWarningSentAt`: 警告メール送信日時（ISO文字列）

**receipts テーブル:**
- `partitionKey`: "receipt"
- `rowKey`: receiptNumber
- `email`: ユーザーのメールアドレス
- `receiptNumber`: 領収書番号
- `amount`: 金額（税込）
- `billingDate`: 請求期間 (YYYY-MM形式)
- `sentAt`: 送信日時（ISO文字列）

### 4. タイムゾーンの調整

Timer TriggerのスケジュールはUTC時間です。日本時間に合わせて調整する場合：

- 現在: `"0 0 9 * * *"` (UTC 9:00 = JST 18:00)
- 日本時間の朝9時に実行したい場合: `"0 0 0 * * *"` (UTC 0:00 = JST 9:00)

`check-trial-warning/function.json` と `send-receipts/function.json` の `schedule` を編集してください。

## 領収書の内容

生成される領収書には以下の情報が含まれます：

1. **発行者情報**
   - 会社名: Wonder Drill株式会社
   - 代表者: 代表取締役医師 平山 傑
   - 所在地: 北海道札幌市中央区南5条西15丁目2-3 リズム医大前503号室
   - 登録番号: T4430001092106（インボイス制度対応）
   - メールアドレス: support@wonder-drill.com

2. **お客様情報**
   - お名前
   - メールアドレス

3. **支払い内容**
   - 項目: Karte AI Plus サブスクリプション
   - 数量: 1
   - 金額（税込）と内消費税の内訳

4. **その他**
   - 領収書番号
   - 発行日
   - 請求期間
   - お支払い方法: Stripe（クレジットカード決済）

## 動作確認

### ローカルでのテスト

```bash
# Azure Functions Core Toolsを使用
func start
```

### デプロイ

```bash
func azure functionapp publish <your-function-app-name>
```

## 注意事項

1. **データベース実装**: `utils/database.js` の実装を実際のデータベース構造に合わせて調整してください。
2. **エラーハンドリング**: 本番環境では、より詳細なエラーログとリトライ機能を実装することを推奨します。
3. **セキュリティ**: 環境変数は適切に管理し、本番環境では Key Vault の使用を推奨します。
4. **領収書の金額**: 現在はデフォルトで1000円（税込）に設定されています。`send-receipts/handler.js` の `subscriptionAmount` を実際の料金に合わせて調整してください。
5. **消費税率**: 現在は10%の消費税率で計算されています。税率が変更される場合は、`utils/receipt.js` の `taxRate` を調整してください。

## 請求書に必要な情報の確認

✅ **実装済みの情報:**
- 会社名
- 代表者名
- 所在地
- メールアドレス
- 登録番号（インボイス）
- 領収書番号
- 発行日
- 請求期間
- 金額（税込・税抜・消費税の内訳）
- お支払い方法（Stripe）

✅ **不要な情報（Stripe決済のため）:**
- 口座番号（Stripeで決済しているため不要）

これで、インボイス制度に対応した領収書を発行できます。
