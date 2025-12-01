# トラブルシューティングガイド

**更新日**: 2025-11-29

---

## 「決済画面の作成に失敗しました」エラー

### 症状
LPフォームで「無料で登録する」をクリックすると、「決済画面の作成に失敗しました」というエラーメッセージが表示される。

### 確認手順

#### 1. ブラウザの開発者ツールで確認

1. **F12** または **右クリック > 検証** で開発者ツールを開く
2. **Console（コンソール）** タブでエラーログを確認
   - `[API]` で始まるログを確認
   - エラーメッセージの詳細を確認
3. **Network（ネットワーク）** タブを選択
4. フォームを送信
5. 以下のリクエストを確認:
   - `auth-send-magic-link`
   - `create-checkout-session`

#### 2. 期待されるレスポンス

##### auth-send-magic-link
```json
{
  "message": "Magic link sent"
}
```

**ステータスコード**: 200 OK

##### create-checkout-session
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

**ステータスコード**: 200 OK

#### 3. エラーの場合の対処法

##### よくあるエラーメッセージと対処法

**「ネットワークエラー: サーバーに接続できませんでした」**
- インターネット接続を確認
- Azure Functionsが稼働しているか確認
- ファイアウォールやプロキシの設定を確認

**「リクエストがタイムアウトしました」**
- ネットワーク接続が不安定な可能性
- もう一度お試しください

**「サーバーエラーが発生しました」**
- Application Insightsでログを確認
- Stripe設定を確認（STRIPE_SECRET_KEY, STRIPE_PRICE_ID）

**「入力データに問題があります」**
- すべての必須項目が正しく入力されているか確認
- メールアドレスの形式を確認

##### CORSエラー

**症状**:
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**解決方法**:
```bash
az functionapp cors add \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --allowed-origins "https://stkarteai1763705952.z11.web.core.windows.net"
```

##### 500エラー

**症状**: `HTTP 500 Internal Server Error`

**解決方法**:
1. Application Insightsでログを確認:
```bash
az monitor app-insights query \
  --app func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --analytics-query "traces | where timestamp > ago(1h) and severityLevel > 2 | order by timestamp desc | take 10"
```

2. Stripe設定を確認:
```bash
az functionapp config appsettings list \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --query "[?name=='STRIPE_SECRET_KEY' || name=='STRIPE_PRICE_ID'].{name:name, value:value}" \
  -o table
```

---

## Stripe設定の確認

### 必要な環境変数

| 変数名 | 説明 | 確認方法 |
|--------|------|----------|
| `STRIPE_SECRET_KEY` | Stripeシークレットキー | `sk_test_...` または `sk_live_...` で始まる |
| `STRIPE_PRICE_ID` | StripeプライスID | `price_...` で始まる |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook シークレット | `whsec_...` で始まる |

### Stripeダッシュボードでの確認

1. [Stripe Dashboard](https://dashboard.stripe.com/) にログイン
2. **製品** > **価格** で `STRIPE_PRICE_ID` が存在することを確認
3. **開発者** > **APIキー** で `STRIPE_SECRET_KEY` を確認
4. **開発者** > **Webhook** で `STRIPE_WEBHOOK_SECRET` を確認

---

## APIの手動テスト

### auth-send-magic-link

```bash
curl -X POST https://func-karte-ai-1763705952.azurewebsites.net/api/auth-send-magic-link \
  -H "Content-Type: application/json" \
  -H "Origin: https://stkarteai1763705952.z11.web.core.windows.net" \
  -d '{
    "email":"test@example.com",
    "name":"テスト",
    "facilityName":"テストクリニック",
    "address":"東京都",
    "phone":"03-1234-5678"
  }'
```

**期待される結果**:
```json
{
  "message": "Magic link sent"
}
```

### create-checkout-session

```bash
curl -X POST https://func-karte-ai-1763705952.azurewebsites.net/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Origin: https://stkarteai1763705952.z11.web.core.windows.net" \
  -d '{
    "email":"test@example.com",
    "name":"テスト",
    "facilityName":"テストクリニック",
    "address":"東京都新宿区",
    "phone":"03-1234-5678",
    "returnUrl":"https://stkarteai1763705952.z11.web.core.windows.net/success"
  }'
```

**期待される結果**:
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

---

## よくある問題と解決方法

### 問題1: LPが古いバージョンを表示している

**症状**: コードを修正したのに、LPに反映されない

**解決方法**:
```bash
# LPをリビルド
cd /Users/suguruhirayama/Chrome_to_Medical/landing-page
npm run build

# Azure Static Websiteにデプロイ
az storage blob upload-batch \
  --account-name stkarteai1763705952 \
  --destination "\$web" \
  --source dist \
  --overwrite
```

**ブラウザのキャッシュをクリア**:
- **Ctrl+Shift+R** (Windows/Linux) または **Cmd+Shift+R** (Mac) でハードリロード

---

### 問題2: Function Appの変更が反映されない

**症状**: Azure Functionsのコードを修正したのに、動作が変わらない

**解決方法**:
```bash
# Function Appを再デプロイ
cd /Users/suguruhirayama/Chrome_to_Medical/azure-functions
func azure functionapp publish func-karte-ai-1763705952 --build remote

# Function Appを再起動
az functionapp restart \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai
```

---

### 問題3: メールが届かない

**症状**: Magic Linkのメールが送信されない

**解決方法**:

1. **SendGrid設定を確認**:
```bash
az functionapp config appsettings list \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --query "[?name=='SENDGRID_API_KEY'].{name:name, value:value}" \
  -o table
```

2. **Application Insightsでエラーを確認**:
```bash
az monitor app-insights query \
  --app func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --analytics-query "traces | where timestamp > ago(1h) and message contains 'sendgrid' or message contains 'email' | order by timestamp desc | take 10"
```

3. **SendGridダッシュボードで送信履歴を確認**

---

## デバッグのベストプラクティス

### 1. ブラウザの開発者ツールを活用

- **Console**: JavaScriptエラーを確認
- **Network**: APIリクエスト/レスポンスを確認
- **Application > Local Storage**: トークンやキャッシュを確認

### 2. Application Insightsでログを確認

```bash
# 最新のエラーログを確認
az monitor app-insights query \
  --app func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --analytics-query "traces | where timestamp > ago(1h) and severityLevel > 2 | order by timestamp desc"
```

### 3. curlでAPIを直接テスト

ブラウザを使わずに、curlでAPIを直接テストすることで、問題がフロントエンド側かバックエンド側かを切り分けられます。

---

## サポート

問題が解決しない場合は、以下の情報を含めて質問してください:

1. エラーメッセージの全文
2. ブラウザの開発者ツールのスクリーンショット（Console & Network）
3. 実行したコマンドと出力
4. Application Insightsのログ（該当する場合）
