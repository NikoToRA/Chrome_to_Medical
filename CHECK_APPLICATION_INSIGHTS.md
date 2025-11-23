# Application Insightsでエラーログを確認する方法

## 問題の状況

- Durationが2-4msで即座に失敗
- `[CHAT] Request received`のログが表示されない
- 関数が実行される前にエラーが発生している可能性

## Application Insightsで確認する手順

### ステップ1: Application Insightsを開く

1. Azure Portal → Function App (`func-karte-ai-1763705952`)
2. **監視** → **ログ**をクリック
3. Application Insightsが有効になっていることを確認

### ステップ2: エラーログを確認

以下のクエリを実行：

```kusto
traces
| where timestamp > ago(10m)
| where message contains "CHAT" or severityLevel >= 3
| order by timestamp desc
| take 50
```

または、より詳細なエラー情報を取得：

```kusto
exceptions
| where timestamp > ago(10m)
| order by timestamp desc
| take 20
```

### ステップ3: 関数の実行ログを確認

```kusto
traces
| where timestamp > ago(10m)
| where operation_Name == "Functions.chat"
| order by timestamp desc
| take 20
```

## 期待される結果

### 正常な場合

```
[CHAT] Function entry point reached
[CHAT] Request received
[CHAT] Sending X messages to model gpt-5-mini
```

### エラーの場合

以下のいずれかが表示されるはずです：

1. **モジュール読み込みエラー**:
   ```
   [CHAT] Module load error: ...
   ```

2. **環境変数の問題**:
   ```
   [CHAT] Missing Azure OpenAI Credentials
   ```

3. **その他のエラー**:
   ```
   Exception: ...
   ```

## 次のステップ

Application Insightsのログを確認して、具体的なエラーメッセージを共有してください。

