# デバッグガイド - 決済画面作成エラー

**作成日**: 2025-11-29  
**目的**: 「決済画面の作成に失敗しました」エラーの原因特定と解決方法

---

## 🔍 問題の整理

### 現在のフロー

```
LPフォーム送信
  ↓
1. auth-send-magic-link (ユーザー情報保存)
  ↓
2. create-checkout-session (Stripe Checkoutセッション作成)
  ↓
3. Stripe Checkoutページへリダイレクト
```

### 想定される問題点

1. **CORSエラー**
   - ブラウザのコンソールに `CORS policy` エラーが表示される
   - 解決: Azure FunctionsのCORS設定を確認

2. **環境変数の設定不備**
   - `STRIPE_SECRET_KEY` が設定されていない
   - `STRIPE_PRICE_ID` が設定されていない
   - 解決: Azure Portalで環境変数を確認

3. **ネットワークエラー**
   - `Failed to fetch` エラーが表示される
   - 解決: インターネット接続とAzure Functionsの稼働状況を確認

4. **Stripe APIエラー**
   - Stripe側のエラー（価格IDが無効、APIキーが無効など）
   - 解決: Stripeダッシュボードで設定を確認

5. **レスポンス形式の不一致**
   - レスポンスに `url` が含まれていない
   - 解決: レスポンスの形式を確認

---

## 🛠️ デバッグ手順

### ステップ1: ブラウザの開発者ツールで確認

1. **F12** で開発者ツールを開く
2. **Console** タブを確認
   - `[API]` で始まるログを確認
   - エラーメッセージの全文をコピー
3. **Network** タブを確認
   - `auth-send-magic-link` リクエストを確認
     - ステータスコード: 200 OK?
     - レスポンス本文: `{"message": "Magic link sent"}`?
   - `create-checkout-session` リクエストを確認
     - ステータスコード: 200 OK?
     - レスポンス本文: `{"url": "https://checkout.stripe.com/..."}`?

### ステップ2: リクエスト/レスポンスの詳細確認

**Networkタブで確認すべき項目**:

1. **リクエストヘッダー**
   ```
   Content-Type: application/json
   Origin: https://stkarteai1763705952.z11.web.core.windows.net
   ```

2. **リクエストボディ** (`create-checkout-session`)
   ```json
   {
     "email": "test@example.com",
     "name": "テスト",
     "facilityName": "テストクリニック",
     "address": "東京都",
     "phone": "03-1234-5678",
     "returnUrl": "https://stkarteai1763705952.z11.web.core.windows.net/success"
   }
   ```

3. **レスポンスステータス**
   - 200 OK: 成功
   - 400 Bad Request: リクエストデータに問題
   - 401/403: 認証エラー
   - 500 Internal Server Error: サーバーエラー

4. **レスポンス本文**
   - 成功時: `{"url": "https://checkout.stripe.com/..."}`
   - エラー時: `{"error": "エラーメッセージ"}`

### ステップ3: Azure Functionsのログを確認

```bash
# Application Insightsでログを確認
az monitor app-insights query \
  --app func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --analytics-query "traces | where timestamp > ago(1h) and message contains 'CreateCheckoutSession' | order by timestamp desc | take 20"
```

### ステップ4: 環境変数の確認

```bash
# Stripe設定を確認
az functionapp config appsettings list \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --query "[?name=='STRIPE_SECRET_KEY' || name=='STRIPE_PRICE_ID'].{name:name, value:value}" \
  -o table
```

**期待される結果**:
```
Name              Value
----------------  ---------------------------
STRIPE_SECRET_KEY sk_test_... または sk_live_...
STRIPE_PRICE_ID   price_...
```

### ステップ5: curlで直接テスト

```bash
curl -X POST https://func-karte-ai-1763705952.azurewebsites.net/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Origin: https://stkarteai1763705952.z11.web.core.windows.net" \
  -d '{
    "email":"test@example.com",
    "name":"テスト",
    "facilityName":"テストクリニック",
    "address":"東京都",
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

## 🐛 よくあるエラーと解決方法

### エラー1: "Server configuration error: Stripe secret key not configured"

**原因**: `STRIPE_SECRET_KEY` 環境変数が設定されていない

**解決方法**:
```bash
az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --settings STRIPE_SECRET_KEY="sk_test_..."
```

### エラー2: "Server configuration error: Stripe price ID not configured"

**原因**: `STRIPE_PRICE_ID` 環境変数が設定されていない

**解決方法**:
```bash
az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --settings STRIPE_PRICE_ID="price_..."
```

### エラー3: "CORS policy: No 'Access-Control-Allow-Origin' header"

**原因**: CORS設定が不十分

**解決方法**:
```bash
az functionapp cors add \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --allowed-origins "https://stkarteai1763705952.z11.web.core.windows.net"
```

### エラー4: "Failed to generate checkout URL"

**原因**: Stripe API呼び出しが失敗

**確認方法**:
- Application InsightsでStripeエラーの詳細を確認
- StripeダッシュボードでAPIキーと価格IDを確認

### エラー5: "決済画面のURLを取得できませんでした"

**原因**: レスポンスに `url` フィールドが含まれていない

**確認方法**:
- Networkタブでレスポンス本文を確認
- コンソールログで `[API] 決済セッション作成成功` の後のレスポンスを確認

---

## 📋 チェックリスト

問題が発生した場合、以下を順番に確認してください:

- [ ] ブラウザのコンソールにエラーログがあるか
- [ ] Networkタブでリクエストが送信されているか
- [ ] レスポンスステータスが200 OKか
- [ ] レスポンス本文に `url` フィールドが含まれているか
- [ ] Azure Functionsの環境変数が設定されているか
- [ ] CORS設定が正しいか
- [ ] Stripeダッシュボードで価格IDが有効か
- [ ] curlで直接テストした結果はどうか

---

## 🔗 関連ドキュメント

- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- [STRIPE_CONFIGURATION.md](./STRIPE_CONFIGURATION.md)
- [UX_FLOW.md](./UX_FLOW.md)

