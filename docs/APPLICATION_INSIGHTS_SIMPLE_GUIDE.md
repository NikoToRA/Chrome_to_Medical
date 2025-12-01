# Application Insights ログ確認 - 超シンプルガイド

**目的**: auth-verify-tokenの401エラーを調査する

---

## 📝 3ステップで確認

### ステップ1: クエリをコピー

以下のクエリを**すべてコピー**してください：

```
traces
| where timestamp > ago(1h)
| where message contains "AuthVerifyToken" or operation_Name contains "auth-verify-token"
| order by timestamp desc
| take 50
```

---

### ステップ2: クエリエディタに貼り付け

1. Azure Portalのログ画面で、**白い大きなテキストエリア**（クエリエディタ）をクリック
2. コピーしたクエリを**貼り付け**（Ctrl+V / Cmd+V）

---

### ステップ3: 実行ボタンをクリック

1. クエリエディタの**右上**にある「**実行**」ボタンをクリック
2. または、キーボードで **Shift + Enter** を押す

---

## ✅ 結果の見方

### ログが表示された場合

**正常なログの例**:
```
[AuthVerifyToken] Configuration check: { hasStripe: true, ... }
[AuthVerifyToken] Creating Stripe Checkout session: { email: "...", ... }
```

**エラーログの例**:
```
[AuthVerifyToken] Token verification failed: { message: "invalid signature", ... }
```

### ログが表示されない場合

- 関数が実行されていない可能性
- 時間範囲を広げる（下記参照）

---

## 🔍 ログが表示されない場合

時間範囲を広げて再実行：

```
traces
| where timestamp > ago(24h)
| where message contains "AuthVerifyToken" or operation_Name contains "auth-verify-token"
| order by timestamp desc
| take 50
```

---

## 🎯 401エラーを確認するクエリ

以下のクエリで401エラーの詳細を確認：

```
requests
| where timestamp > ago(1h)
| where url contains "auth-verify-token"
| where resultCode == 401
| order by timestamp desc
| take 20
```

**実行方法**: 上記と同じ（コピー → 貼り付け → 実行）

---

## 📊 よくあるエラーメッセージ

### 1. `JsonWebTokenError: invalid signature`
→ **JWT_SECRETが一致していない**

### 2. `TokenExpiredError`
→ **トークンが期限切れ（15分）**

### 3. ログが全くない
→ **関数が実行されていない（コードがデプロイされていない可能性）**

---

## 🚀 クイックリファレンス

### すべてのログを確認
```
traces
| where timestamp > ago(1h)
| where message contains "AuthVerifyToken"
| order by timestamp desc
| take 50
```

### エラーのみを確認
```
traces
| where timestamp > ago(1h)
| where message contains "AuthVerifyToken"
| where severityLevel >= 3
| order by timestamp desc
| take 30
```

### 401エラーのリクエスト
```
requests
| where timestamp > ago(1h)
| where url contains "auth-verify-token"
| where resultCode == 401
| order by timestamp desc
| take 20
```

---

## 💡 ポイント

1. **クエリをコピー** → クエリエディタに**貼り付け** → **実行**
2. ログが表示されない場合は、**時間範囲を広げる**（`ago(24h)`など）
3. エラーメッセージを確認して、問題を特定

---

**作成者**: AI Assistant  
**最終更新**: 2025-11-30

