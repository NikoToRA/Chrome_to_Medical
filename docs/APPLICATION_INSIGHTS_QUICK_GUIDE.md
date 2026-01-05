# Application Insights クイックガイド（auth-verify-token 401エラー調査）

**作成日**: 2025-11-30  
**目的**: auth-verify-tokenの401エラーを素早く調査する

---

## 🚀 最も簡単な確認方法（Azure Portal）

### ステップ1: Azure Portalを開く

1. **Azure Portal**にアクセス: https://portal.azure.com
2. 検索バー（上部）で「**func-karte-ai-1763705952**」を検索
3. **Function App**をクリック

---

### ステップ2: ログを開く

1. 左メニューの「**監視**」セクションを展開
2. 「**ログ**」をクリック

**初回の場合**:
- 「**Application Insightsワークスペースを選択**」という画面が表示される
- ワークスペースを選択して「**適用**」をクリック

---

### ステップ3: クエリを実行

以下のクエリをコピー＆ペーストして「**実行**」ボタンをクリック：

#### 🔍 クエリ1: auth-verify-tokenのすべてのログ

```kusto
traces
| where timestamp > ago(1h)
| where message contains "AuthVerifyToken" or operation_Name contains "auth-verify-token"
| order by timestamp desc
| take 50
```

#### 🔍 クエリ2: 401エラーのリクエスト

```kusto
requests
| where timestamp > ago(1h)
| where url contains "auth-verify-token"
| where resultCode == 401
| order by timestamp desc
| take 20
| project timestamp, url, resultCode, duration, operation_Name
```

#### 🔍 クエリ3: すべての例外

```kusto
exceptions
| where timestamp > ago(1h)
| where operation_Name contains "auth-verify-token" or type contains "auth-verify-token"
| order by timestamp desc
| take 20
```

#### 🔍 クエリ4: すべてのリクエスト（auth-verify-token関連）

```kusto
requests
| where timestamp > ago(1h)
| where url contains "auth-verify-token"
| order by timestamp desc
| take 30
| project timestamp, url, resultCode, duration, operation_Name, name
```

---

## 📊 ログの見方

### 正常なログの例

```
[AuthVerifyToken] Configuration check: {
  hasStripe: true,
  hasPriceId: true,
  hasSuccessUrl: true,
  shouldRedirectToCheckout: true,
  email: "super206cc@gmail.com"
}
```

### エラーログの例

```
[AuthVerifyToken] Token verification failed: {
  message: "invalid signature",
  name: "JsonWebTokenError"
}
```

---

## 🎯 確認すべきポイント

### 1. ログが出力されているか

- **ログがある場合**: エラーメッセージを確認
- **ログがない場合**: 関数が実行されていない可能性

### 2. トークン検証のエラー

- `JsonWebTokenError` → JWT_SECRETが一致しない
- `TokenExpiredError` → トークンが期限切れ
- `NotBeforeError` → トークンがまだ有効になっていない

### 3. 環境変数の確認

- `hasStripe: false` → `STRIPE_SECRET_KEY`が設定されていない
- `hasPriceId: false` → `STRIPE_PRICE_ID`が設定されていない
- `hasSuccessUrl: false` → `SUCCESS_PAGE_URL`が設定されていない

---

## 🔧 ログが表示されない場合

### 原因1: ログの取り込みに時間がかかっている

**解決方法**:
- 数分待ってから再度確認
- 時間範囲を広げる（`ago(2h)`など）

### 原因2: Application Insightsが有効になっていない

**確認方法**:
1. Function App → **設定** → **Application Insights**
2. Application Insightsが有効になっているか確認

### 原因3: 関数が実行されていない

**確認方法**:
- より広い範囲でログを確認
- Function Appの状態を確認

---

## 📝 クイックリファレンス

### よく使うクエリ

#### 最近のすべてのログ
```kusto
traces
| where timestamp > ago(30m)
| order by timestamp desc
| take 50
```

#### エラーのみ
```kusto
traces
| where timestamp > ago(30m)
| where severityLevel >= 3
| order by timestamp desc
| take 30
```

#### 特定の関数のログ
```kusto
traces
| where timestamp > ago(30m)
| where operation_Name == "Functions.auth-verify-token"
| order by timestamp desc
| take 30
```

---

## 🎯 次のステップ

ログを確認した後：

1. **エラーメッセージを確認**
   - トークン検証のエラーか
   - 環境変数の問題か
   - Stripe APIのエラーか

2. **問題に応じて対応**
   - トークン検証エラー → JWT_SECRETを確認
   - 環境変数の問題 → 環境変数を設定
   - Stripe APIエラー → Stripe設定を確認

3. **修正後、再度テスト**
   - 新しいMagic Linkをリクエスト
   - 動作を確認

---

## 📚 関連ドキュメント

- `docs/APPLICATION_INSIGHTS_AUTH_VERIFY_TOKEN.md` - 詳細ガイド
- `docs/AUTH_VERIFY_TOKEN_DEBUGGING.md` - デバッグガイド
- `docs/AUTH_VERIFY_TOKEN_FIX.md` - 修正ガイド

---

**作成者**: AI Assistant  
**最終更新**: 2025-11-30


