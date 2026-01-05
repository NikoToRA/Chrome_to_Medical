# auth-verify-token デバッグガイド

**作成日**: 2025-11-29  
**目的**: Magic Linkクリック後の動作が正常でない場合の診断方法

---

## 🔍 問題の症状

Magic Linkをクリックしたが、以下のいずれかが発生する：
- Stripe Checkoutにリダイレクトされない
- エラーページが表示される
- フォールバックページ（トークン表示ページ）が表示される

---

## 📋 診断手順

### ステップ1: 環境変数の確認

```bash
# 診断スクリプトを実行
./scripts/diagnose-auth-verify-token.sh
```

または、手動で確認：

```bash
az functionapp config appsettings list \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --query "[?name=='SUCCESS_PAGE_URL' || name=='CANCEL_PAGE_URL' || name=='STRIPE_PRICE_ID' || name=='STRIPE_SECRET_KEY' || name=='JWT_SECRET'].{Name:name, Value:value}" \
  --output table
```

**必要な環境変数**:
- ✅ `JWT_SECRET` - 必須
- ✅ `STRIPE_SECRET_KEY` - Stripe Checkoutにリダイレクトする場合に必須
- ✅ `STRIPE_PRICE_ID` - Stripe Checkoutにリダイレクトする場合に必須
- ✅ `SUCCESS_PAGE_URL` - Stripe Checkoutにリダイレクトする場合に必須
- ⚠️ `CANCEL_PAGE_URL` - オプション（設定されていない場合は自動生成）

---

### ステップ2: テストトークンで動作確認

```bash
# テストスクリプトを実行
./scripts/test-auth-verify-token.sh
```

このスクリプトは：
1. テスト用のトークンを生成
2. テストURLを表示
3. オプションでcurlでテスト実行

---

### ステップ3: Application Insightsでログを確認

**Azure Portal** → **Function App** (`func-karte-ai-1763705952`) → **監視** → **ログ**

以下のクエリを実行：

```kusto
traces
| where timestamp > ago(10m)
| where message contains "AuthVerifyToken"
| order by timestamp desc
| take 20
```

**確認すべきログ**:

1. **設定チェック**:
   ```
   [AuthVerifyToken] Configuration check: {
     hasStripe: true/false,
     hasPriceId: true/false,
     hasSuccessUrl: true/false,
     shouldRedirectToCheckout: true/false,
     email: "xxx@example.com"
   }
   ```

2. **Stripe Checkoutセッション作成**:
   ```
   [AuthVerifyToken] Creating Stripe Checkout session: {
     email: "xxx@example.com",
     successUrl: "...",
     cancelUrl: "...",
     priceId: "price_xxx"
   }
   ```

3. **成功ログ**:
   ```
   [AuthVerifyToken] Stripe Checkout session created successfully: {
     sessionId: "cs_test_xxx",
     hasUrl: true
   }
   ```

4. **エラーログ**:
   ```
   [AuthVerifyToken] Stripe Checkout session creation failed: {
     message: "...",
     type: "...",
     code: "...",
     statusCode: ...
   }
   ```

---

## 🐛 よくある問題と解決方法

### 問題1: 環境変数が設定されていない

**症状**: フォールバックページ（設定エラーページ）が表示される

**解決方法**:
```bash
# 環境変数を設定
az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --settings \
    SUCCESS_PAGE_URL="https://stkarteai1763705952.z11.web.core.windows.net/success" \
    CANCEL_PAGE_URL="https://stkarteai1763705952.z11.web.core.windows.net/cancel"

# Function Appを再起動
az functionapp restart \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai
```

---

### 問題2: Stripe Checkoutセッション作成に失敗

**症状**: エラーページが表示される

**原因**:
- Stripe APIキーが無効
- Price IDが存在しない
- Stripe APIのレート制限

**解決方法**:

1. **Stripe APIキーを確認**:
   ```bash
   az functionapp config appsettings list \
     --name func-karte-ai-1763705952 \
     --resource-group rg-karte-ai \
     --query "[?name=='STRIPE_SECRET_KEY'].value" \
     --output tsv
   ```
   - StripeダッシュボードでAPIキーが有効か確認
   - テストモードと本番モードが一致しているか確認

2. **Price IDを確認**:
   ```bash
   az functionapp config appsettings list \
     --name func-karte-ai-1763705952 \
     --resource-group rg-karte-ai \
     --query "[?name=='STRIPE_PRICE_ID'].value" \
     --output tsv
   ```
   - StripeダッシュボードでPrice IDが存在するか確認

3. **Application Insightsでエラー詳細を確認**:
   ```kusto
   exceptions
   | where timestamp > ago(10m)
   | where message contains "Stripe"
   | order by timestamp desc
   | take 10
   ```

---

### 問題3: リダイレクトが動作しない

**症状**: 302リダイレクトが返されるが、ブラウザでリダイレクトされない

**原因**:
- CORSの問題
- ブラウザのセキュリティ設定
- キャッシュの問題

**解決方法**:

1. **ブラウザの開発者ツールで確認**:
   - Networkタブでリクエストを確認
   - レスポンスヘッダーに `Location` が含まれているか確認
   - HTTPステータスコードが302か確認

2. **キャッシュをクリア**:
   - **Ctrl+Shift+R** (Windows/Linux) または **Cmd+Shift+R** (Mac) でハードリロード

3. **別のブラウザでテスト**:
   - プライベートモード/シークレットモードでテスト

---

### 問題4: トークンが期限切れ

**症状**: "Invalid or expired token" エラー

**原因**: Magic Linkトークンの有効期限（15分）が切れている

**解決方法**:
- 新しいMagic Linkをリクエスト
- メールを再送信

---

## 🔧 トラブルシューティングコマンド

### 環境変数の一括確認

```bash
./scripts/diagnose-auth-verify-token.sh
```

### テストトークンで動作確認

```bash
./scripts/test-auth-verify-token.sh
```

### Function Appの再起動

```bash
az functionapp restart \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai
```

### 最新のログを確認

```bash
az functionapp log tail \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai
```

---

## 📊 正常な動作フロー

1. **Magic Linkクリック**
   ```
   https://func-karte-ai-1763705952.azurewebsites.net/api/auth-verify-token?token=xxx
   ```

2. **トークン検証**
   - JWTトークンを検証
   - メールアドレスを取得
   - セッショントークンを生成

3. **Stripe Checkoutセッション作成**
   - Stripe APIを呼び出し
   - Checkoutセッションを作成

4. **リダイレクト**
   - HTTP 302レスポンス
   - `Location: https://checkout.stripe.com/c/pay/cs_test_xxx`

5. **Stripe Checkout表示**
   - ユーザーが決済情報を入力

---

## 🎯 チェックリスト

問題が発生した場合、以下を順番に確認：

- [ ] 環境変数が正しく設定されているか
- [ ] Function Appが実行中か
- [ ] Application Insightsでログを確認
- [ ] Stripe APIキーが有効か
- [ ] Price IDが存在するか
- [ ] トークンが期限切れていないか
- [ ] ブラウザのキャッシュをクリア
- [ ] 別のブラウザでテスト

---

## 📚 関連ドキュメント

- `docs/NEXT_STEPS_IMPLEMENTATION_PLAN.md` - 実装計画
- `docs/UX_FLOW.md` - UXフロー
- `docs/TROUBLESHOOTING.md` - 一般的なトラブルシューティング

---

**作成者**: AI Assistant  
**最終更新**: 2025-11-29


