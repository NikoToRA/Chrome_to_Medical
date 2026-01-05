# auth-verify-token 401エラー修正ガイド

**作成日**: 2025-11-30  
**問題**: Magic Linkクリック時にHTTP 401エラーが発生

---

## 🔍 問題の原因

HTTP 401エラーが発生する主な原因：

1. **Function Appのコードが最新でない**
   - 改善したコードがまだデプロイされていない
   - 古いコードが実行されている

2. **Function Appが再起動されていない**
   - 環境変数を変更した後、再起動が必要
   - コードをデプロイした後、再起動が必要

3. **JWT_SECRETの不一致**
   - `auth-send-magic-link`でトークンを作成する時のJWT_SECRETと
   - `auth-verify-token`で検証する時のJWT_SECRETが異なる

---

## ✅ 解決方法

### ステップ1: Function Appを再デプロイ

改善したコードをデプロイします：

```bash
cd /Users/suguruhirayama/Chrome_to_Medical/azure-functions
func azure functionapp publish func-karte-ai-1763705952 --build remote
```

**注意**: デプロイには数分かかることがあります。

---

### ステップ2: Function Appを再起動

デプロイ後、必ず再起動します：

```bash
az functionapp restart \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai
```

**重要**: 再起動後、数分待ってからテストしてください。

---

### ステップ3: JWT_SECRETの確認

`auth-send-magic-link`と`auth-verify-token`で同じJWT_SECRETを使っているか確認：

```bash
# JWT_SECRETを確認
az functionapp config appsettings list \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --query "[?name=='JWT_SECRET'].{Name:name, Value:value}" \
  --output table
```

**確認ポイント**:
- JWT_SECRETが設定されているか
- 値が空でないか
- 余分なスペースや改行がないか

---

### ステップ4: 新しいMagic Linkでテスト

1. **LPフォームから新しいMagic Linkをリクエスト**
   ```
   LPフォーム → sendMagicLink() → メール送信
   ```

2. **メールを受信（15分以内にクリック）**

3. **Magic Linkをクリック**
   - Stripe Checkoutにリダイレクトされるか確認
   - または、改善されたエラーページが表示されるか確認

---

## 🧪 テスト方法

### 方法1: ブラウザで直接テスト

1. 新しいMagic Linkをクリック
2. ブラウザの開発者ツール（F12）を開く
3. Networkタブでリクエストを確認
4. レスポンスのステータスコードと内容を確認

### 方法2: curlでテスト

```bash
# 新しいMagic LinkのURLを取得
curl -i -L "https://func-karte-ai-1763705952.azurewebsites.net/api/auth-verify-token?token=YOUR_TOKEN"
```

**期待される結果**:
- **成功**: HTTP 302リダイレクト → Stripe Checkout
- **エラー**: HTTP 401 → 改善されたエラーページ（HTML）

---

## 📊 Application Insightsでログを確認

**Azure Portal** → **Function App** → **監視** → **ログ**

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
     hasStripe: true,
     hasPriceId: true,
     hasSuccessUrl: true,
     shouldRedirectToCheckout: true,
     email: "xxx@example.com"
   }
   ```

2. **トークン検証**:
   - エラーがないか確認
   - トークンが正しく検証されているか確認

3. **Stripe Checkoutセッション作成**:
   ```
   [AuthVerifyToken] Creating Stripe Checkout session: ...
   [AuthVerifyToken] Stripe Checkout session created successfully: ...
   ```

---

## 🐛 トラブルシューティング

### 問題1: デプロイ後も401エラーが続く

**原因**: Function Appが再起動されていない

**解決方法**:
```bash
# Function Appを再起動
az functionapp restart \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai

# 数分待ってから再度テスト
```

---

### 問題2: JWT_SECRETが一致しない

**症状**: トークン検証に失敗する

**解決方法**:

1. **JWT_SECRETを再設定**:
   ```bash
   # 新しいJWT_SECRETを生成
   openssl rand -hex 32
   
   # Function Appに設定
   az functionapp config appsettings set \
     --name func-karte-ai-1763705952 \
     --resource-group rg-karte-ai \
     --settings JWT_SECRET="新しいJWT_SECRET"
   ```

2. **Function Appを再起動**

3. **新しいMagic Linkをリクエスト**
   - 古いトークンは無効になるため、新しいMagic Linkが必要

---

### 問題3: デプロイに失敗する

**症状**: `func azure functionapp publish` が失敗する

**解決方法**:

1. **Azure Functions Core Toolsがインストールされているか確認**:
   ```bash
   func --version
   ```

2. **Azure CLIにログイン**:
   ```bash
   az login
   ```

3. **Function Appの状態を確認**:
   ```bash
   az functionapp show \
     --name func-karte-ai-1763705952 \
     --resource-group rg-karte-ai \
     --query "state"
   ```

---

## 📝 チェックリスト

問題を解決するために、以下を順番に確認：

- [ ] Function Appのコードを再デプロイ
- [ ] Function Appを再起動
- [ ] JWT_SECRETが正しく設定されているか確認
- [ ] 新しいMagic Linkでテスト
- [ ] Application Insightsでログを確認
- [ ] エラーメッセージを確認

---

## 🎯 期待される動作

修正後、以下のように動作するはずです：

1. **Magic Linkクリック**
   ```
   https://func-karte-ai-1763705952.azurewebsites.net/api/auth-verify-token?token=xxx
   ```

2. **トークン検証成功**
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

## 📚 関連ドキュメント

- `docs/AUTH_VERIFY_TOKEN_DEBUGGING.md` - デバッグガイド
- `docs/NEXT_STEPS_IMPLEMENTATION_PLAN.md` - 実装計画
- `docs/TROUBLESHOOTING.md` - 一般的なトラブルシューティング

---

**作成者**: AI Assistant  
**最終更新**: 2025-11-30


