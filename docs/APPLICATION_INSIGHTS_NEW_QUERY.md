# Application Insights - 新しいクエリを実行する方法

**状況**: 既存のクエリが開いていて、置き換えられない

---

## 🎯 最も簡単な方法

### 方法1: 新しいクエリタブを開く（推奨）

1. **画面上部のタブ**を見る
2. 「**+**」ボタン（新しいクエリ）をクリック
3. 新しいタブが開く
4. **左側のナビゲーションペイン**で「**traces**」を探す
5. 「**traces**」を**ダブルクリック**
6. 自動的に `traces` というクエリが生成される
7. そのクエリを以下のように**編集**：

```
traces
| where timestamp > ago(1h)
| where message contains "AuthVerifyToken" or operation_Name contains "auth-verify-token"
| order by timestamp desc
| take 50
```

8. **実行**ボタンをクリック（または **Shift + Enter**）

---

### 方法2: 既存のクエリを全削除して新しく入力

1. クエリエディタ内の**すべてのテキストを選択**（Ctrl+A / Cmd+A）
2. **削除**（Delete / Backspace）
3. 以下のクエリを**貼り付け**：

```
traces
| where timestamp > ago(1h)
| where message contains "AuthVerifyToken" or operation_Name contains "auth-verify-token"
| order by timestamp desc
| take 50
```

4. **実行**ボタンをクリック

---

### 方法3: 左側のテーブルから直接選択

1. **左側のナビゲーションペイン**で「**traces**」を探す
2. 「**traces**」を**右クリック**
3. 「**Use in query**」または「**クエリで使用**」をクリック
4. 新しいクエリタブが開く
5. クエリを上記のように編集
6. **実行**

---

## 📝 コピー用クエリ

### auth-verify-tokenのログを確認

```
traces
| where timestamp > ago(1h)
| where message contains "AuthVerifyToken" or operation_Name contains "auth-verify-token"
| order by timestamp desc
| take 50
```

### 401エラーを確認

```
requests
| where timestamp > ago(1h)
| where url contains "auth-verify-token"
| where resultCode == 401
| order by timestamp desc
| take 20
```

---

## ✅ 実行後の確認

### ログが表示された場合

- `[AuthVerifyToken]` で始まるログを探す
- エラーメッセージを確認

### ログが表示されない場合

時間範囲を広げる：

```
traces
| where timestamp > ago(24h)
| where message contains "AuthVerifyToken" or operation_Name contains "auth-verify-token"
| order by timestamp desc
| take 50
```

---

**作成者**: AI Assistant  
**最終更新**: 2025-11-30


