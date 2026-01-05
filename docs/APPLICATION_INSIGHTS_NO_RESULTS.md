# Application Insights - ログが見つからない場合の対処法

**状況**: クエリは正しく実行されたが、「No results found」と表示される

---

## 🔍 原因と対処法

### 原因1: 時間範囲が短すぎる

**対処法**: 時間範囲を広げる

クエリを以下のように変更：

```
traces
| where timestamp > ago(24h)
| where message contains "AuthVerifyToken" or operation_Name contains "auth-verify-token"
| order by timestamp desc
| take 50
```

**変更点**: `ago(1h)` → `ago(24h)`

---

### 原因2: 関数が実行されていない

**確認方法**: より広い範囲でログを確認

```
traces
| where timestamp > ago(7d)
| where operation_Name contains "auth-verify-token"
| order by timestamp desc
| take 50
```

---

### 原因3: ログの取り込みに時間がかかっている

**対処法**: 数分待ってから再度実行

---

## 🎯 推奨クエリ（時間範囲を広げた版）

### 24時間以内のログを確認

```
traces
| where timestamp > ago(24h)
| where message contains "AuthVerifyToken" or operation_Name contains "auth-verify-token"
| order by timestamp desc
| take 50
```

### 7日以内のログを確認

```
traces
| where timestamp > ago(7d)
| where operation_Name contains "auth-verify-token"
| order by timestamp desc
| take 50
```

### 401エラーのリクエストを確認（24時間）

```
requests
| where timestamp > ago(24h)
| where url contains "auth-verify-token"
| where resultCode == 401
| order by timestamp desc
| take 20
```

---

## ✅ 次のステップ

1. **時間範囲を広げる**（`ago(24h)`に変更）
2. **再度実行**
3. それでもログがない場合 → 関数が実行されていない可能性

---

**作成者**: AI Assistant  
**最終更新**: 2025-11-30


