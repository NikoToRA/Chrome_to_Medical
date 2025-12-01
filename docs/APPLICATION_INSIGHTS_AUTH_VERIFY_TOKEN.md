# Application Insightsでauth-verify-tokenのログを確認する方法

**作成日**: 2025-11-30  
**目的**: auth-verify-tokenの401エラーを調査するためのApplication Insights確認ガイド

---

## 📋 確認手順（Azure Portal）

### ステップ1: Application Insightsを開く

1. **Azure Portal**にログイン: https://portal.azure.com
2. 検索バーで「**func-karte-ai-1763705952**」を検索
3. **Function App**をクリック
4. 左メニューの「**監視**」セクションを展開
5. 「**ログ**」をクリック

**注意**: 初回はApplication Insightsのワークスペースを選択する必要がある場合があります。

---

### ステップ2: auth-verify-tokenのログを確認

以下のクエリをコピー＆ペーストして実行：

#### クエリ1: 最近のauth-verify-tokenのログ（基本）

```kusto
traces
| where timestamp > ago(30m)
| where message contains "AuthVerifyToken" or operation_Name contains "auth-verify-token"
| order by timestamp desc
| take 50
```

#### クエリ2: エラーのみを確認

```kusto
traces
| where timestamp > ago(30m)
| where (message contains "AuthVerifyToken" or operation_Name contains "auth-verify-token")
| where severityLevel >= 3
| order by timestamp desc
| take 30
```

#### クエリ3: 例外（Exception）を確認

```kusto
exceptions
| where timestamp > ago(30m)
| where operation_Name contains "auth-verify-token" or type contains "auth-verify-token"
| order by timestamp desc
| take 20
```

#### クエリ4: リクエストの詳細を確認

```kusto
requests
| where timestamp > ago(30m)
| where url contains "auth-verify-token"
| order by timestamp desc
| take 20
| project timestamp, url, resultCode, duration, operation_Name
```

#### クエリ5: 401エラーの詳細を確認

```kusto
requests
| where timestamp > ago(30m)
| where url contains "auth-verify-token"
| where resultCode == 401
| order by timestamp desc
| take 20
| project timestamp, url, resultCode, duration, operation_Name, name
```

---

## 🔍 確認すべきポイント

### 1. ログが出力されているか

**正常な場合**:
```
[AuthVerifyToken] Configuration check: { hasStripe: true, hasPriceId: true, ... }
[AuthVerifyToken] Creating Stripe Checkout session: { email: "...", ... }
[AuthVerifyToken] Stripe Checkout session created successfully: { sessionId: "...", ... }
```

**エラーの場合**:
```
[AuthVerifyToken] Token verification failed: { message: "...", name: "..." }
```

**ログが全くない場合**:
- Function Appのコードが最新でない可能性
- 関数が実行されていない可能性

---

### 2. トークン検証のエラー

**確認すべきログ**:
- `Token verification failed`
- `JsonWebTokenError`
- `TokenExpiredError`
- `NotBeforeError`

**エラーメッセージの例**:
```
[AuthVerifyToken] Token verification failed: {
  message: "invalid signature",
  name: "JsonWebTokenError",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 3. 環境変数の確認

**確認すべきログ**:
```
[AuthVerifyToken] Configuration check: {
  hasStripe: true/false,
  hasPriceId: true/false,
  hasSuccessUrl: true/false,
  shouldRedirectToCheckout: true/false,
  email: "xxx@example.com"
}
```

**問題がある場合**:
- `hasStripe: false` → `STRIPE_SECRET_KEY`が設定されていない
- `hasPriceId: false` → `STRIPE_PRICE_ID`が設定されていない
- `hasSuccessUrl: false` → `SUCCESS_PAGE_URL`が設定されていない

---

### 4. Stripe Checkoutセッション作成のエラー

**確認すべきログ**:
```
[AuthVerifyToken] Stripe Checkout session creation failed: {
  message: "...",
  type: "...",
  code: "...",
  statusCode: ...
}
```

**よくあるエラー**:
- `Invalid API Key` → Stripe APIキーが無効
- `No such price` → Price IDが存在しない
- `Rate limit exceeded` → Stripe APIのレート制限

---

## 🖥️ Azure CLIで確認する方法

### 方法1: Application Insightsのクエリを実行

```bash
# Application InsightsリソースIDを取得
APP_INSIGHTS_ID=$(az functionapp show \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai \
  --query "applicationId" \
  --output tsv)

# ログをクエリ
az monitor app-insights query \
  --app "$APP_INSIGHTS_ID" \
  --analytics-query "traces | where timestamp > ago(30m) | where message contains 'AuthVerifyToken' | order by timestamp desc | take 20"
```

### 方法2: Function Appのログストリームを確認

```bash
# リアルタイムでログを確認
az functionapp log tail \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai
```

---

## 📊 ログの見方

### ログの構造

Application Insightsのログには以下の情報が含まれます：

- **timestamp**: ログの時刻
- **message**: ログメッセージ
- **severityLevel**: 重要度（1=Verbose, 2=Information, 3=Warning, 4=Error）
- **operation_Name**: 操作名（例: `Functions.auth-verify-token`）
- **customDimensions**: カスタムプロパティ（JSON形式）

### 重要度レベル

- **1 (Verbose)**: 詳細なデバッグ情報
- **2 (Information)**: 通常の情報（`context.log()`）
- **3 (Warning)**: 警告（`context.log.warn()`）
- **4 (Error)**: エラー（`context.log.error()`）

---

## 🎯 具体的な調査手順

### ステップ1: 最新のログを確認

```kusto
traces
| where timestamp > ago(10m)
| where message contains "AuthVerifyToken"
| order by timestamp desc
| take 20
```

### ステップ2: 401エラーが発生したリクエストを確認

```kusto
requests
| where timestamp > ago(10m)
| where url contains "auth-verify-token"
| where resultCode == 401
| order by timestamp desc
| take 10
```

### ステップ3: 例外を確認

```kusto
exceptions
| where timestamp > ago(10m)
| where operation_Name contains "auth-verify-token"
| order by timestamp desc
| take 10
```

### ステップ4: 関連するログを時系列で確認

```kusto
union traces, exceptions, requests
| where timestamp > ago(10m)
| where operation_Name contains "auth-verify-token" or url contains "auth-verify-token"
| order by timestamp desc
| take 30
```

---

## 🔧 トラブルシューティング

### 問題1: ログが表示されない

**原因**:
- Application Insightsが有効になっていない
- ログのサンプリングが有効になっている
- 時間範囲が短すぎる

**解決方法**:
1. Application Insightsが有効か確認
2. 時間範囲を広げる（`ago(1h)`など）
3. サンプリング設定を確認

### 問題2: ログが古い

**原因**:
- ログの取り込みに時間がかかっている

**解決方法**:
- 数分待ってから再度確認
- 時間範囲を広げる

### 問題3: クエリが実行できない

**原因**:
- Application Insightsのワークスペースが選択されていない
- 権限がない

**解決方法**:
1. Application Insightsのワークスペースを選択
2. 適切な権限があるか確認

---

## 📝 チェックリスト

ログを確認する際、以下をチェック：

- [ ] ログが出力されているか
- [ ] トークン検証のエラーメッセージを確認
- [ ] 環境変数の設定状況を確認
- [ ] Stripe Checkoutセッション作成のエラーを確認
- [ ] 401エラーが発生したリクエストの詳細を確認
- [ ] 例外（Exception）の詳細を確認

---

## 🎯 期待されるログ（正常な場合）

```
[AuthVerifyToken] Configuration check: {
  hasStripe: true,
  hasPriceId: true,
  hasSuccessUrl: true,
  shouldRedirectToCheckout: true,
  email: "super206cc@gmail.com"
}
[AuthVerifyToken] Creating Stripe Checkout session: {
  email: "super206cc@gmail.com",
  successUrl: "https://...",
  cancelUrl: "https://...",
  priceId: "price_xxx"
}
[AuthVerifyToken] Stripe Checkout session created successfully: {
  sessionId: "cs_test_xxx",
  hasUrl: true
}
```

---

## 🎯 エラーログ（問題がある場合）

```
[AuthVerifyToken] Token verification failed: {
  message: "invalid signature",
  name: "JsonWebTokenError",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

または

```
[AuthVerifyToken] Stripe Checkout redirect skipped - missing configuration: {
  hasStripe: false,
  hasPriceId: true,
  hasSuccessUrl: true
}
```

---

## 📚 関連ドキュメント

- `docs/AUTH_VERIFY_TOKEN_DEBUGGING.md` - デバッグガイド
- `docs/AUTH_VERIFY_TOKEN_FIX.md` - 修正ガイド
- `logs/CHECK_APPLICATION_INSIGHTS.md` - Application Insights確認方法（一般）

---

**作成者**: AI Assistant  
**最終更新**: 2025-11-30

