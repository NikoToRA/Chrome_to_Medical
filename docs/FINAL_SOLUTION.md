# 最終解決策 - 401エラーを解決する

**日時**: 2025-11-30  
**問題**: Magic Linkをクリックすると401エラーが返される

---

## 🎯 最も可能性が高い原因

**JWT_SECRETの不一致**

- `auth-send-magic-link`でトークンを作成する時のJWT_SECRET
- `auth-verify-token`で検証する時のJWT_SECRET

この2つが一致していない可能性があります。

---

## ✅ 解決方法

### 方法1: クイック修正スクリプトを実行（推奨）

```bash
./scripts/quick-fix-auth.sh
```

このスクリプトは:
1. 現在のJWT_SECRETを取得
2. 同じJWT_SECRETでテストトークンを生成
3. テストURLを生成
4. ブラウザでテスト

### 方法2: 手動で確認

#### ステップ1: 実際のMagic Linkのトークンを確認

メールに送信されたMagic Linkから、トークン部分を抜き出します。

**Magic Linkの例**:
```
https://func-karte-ai-1763705952.azurewebsites.net/api/auth-verify-token?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**トークン部分**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### ステップ2: トークンをデコード

```bash
node /Users/suguruhirayama/Chrome_to_Medical/scripts/decode-jwt-token.js "トークンをここに貼り付け"
```

#### ステップ3: 有効期限を確認

トークンが期限切れていないか確認します（有効期限は15分）。

---

## 🔧 根本的な解決方法

### JWT_SECRETを再設定する

もしJWT_SECRETが一致していない場合、再設定します。

```bash
# 新しいJWT_SECRETを生成
NEW_SECRET=$(openssl rand -base64 32)

# Function Appに設定
az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --settings JWT_SECRET="$NEW_SECRET"

# Function Appを再起動
az functionapp restart \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai

# 新しいMagic Linkをリクエスト（古いトークンは無効）
```

---

## 🚀 今すぐ動かす方法

### ステップ1: テストトークンを生成

```bash
cd /Users/suguruhirayama/Chrome_to_Medical/azure-functions

# JWT_SECRETを取得
JWT_SECRET=$(az functionapp config appsettings list \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --query "[?name=='JWT_SECRET'].value" \
  --output tsv)

# テストトークンを生成
node -e "
const jwt = require('jsonwebtoken');
const secret = '$JWT_SECRET';
const email = 'test@example.com';
const token = jwt.sign({ email }, secret, { expiresIn: '15m' });
console.log('Test URL:');
console.log('https://func-karte-ai-1763705952.azurewebsites.net/api/auth-verify-token?token=' + token);
"
```

### ステップ2: テストURLをブラウザで開く

生成されたURLをブラウザで開いて、動作を確認します。

---

## 📊 期待される動作

### 成功の場合

1. Stripe Checkoutページに自動リダイレクト
2. URLが `https://checkout.stripe.com/c/pay/...` に変わる
3. 決済情報を入力できる

### エラーの場合

1. エラーページが表示される
2. エラーメッセージを確認
3. Application Insightsでログを確認

---

## 🔍 デバッグ方法

### Application Insightsでログを確認

```kusto
traces
| where timestamp > ago(30m)
| where message contains "AuthVerifyToken"
| order by timestamp desc
| take 50
```

**期待されるログ**:
```
[AuthVerifyToken] Configuration check: { hasStripe: true, ... }
[AuthVerifyToken] Token verification failed: { message: "...", ... }
```

または

```
[AuthVerifyToken] Configuration check: { hasStripe: true, ... }
[AuthVerifyToken] Creating Stripe Checkout session: { email: "...", ... }
[AuthVerifyToken] Stripe Checkout session created successfully: { sessionId: "...", ... }
```

---

**作成者**: AI Assistant  
**最終更新**: 2025-11-30

