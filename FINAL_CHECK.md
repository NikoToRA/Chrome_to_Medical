# 最終確認チェックリスト

## ✅ 確認済み

- Function Appの状態: `Running`（実行中）
- すべての関数が`✔ Enabled`（有効）
- 環境変数の更新が成功（通知に表示）

## 🔍 次に確認すべきこと

### 1. 環境変数の確認

Azure Portalで以下を確認してください：

1. **Function App** (`func-karte-ai-1763705952`) → **設定** → **構成** → **アプリケーション設定**
2. 以下の3つの環境変数が**正しく設定されているか**確認：

```
AZURE_OPENAI_ENDPOINT = https://karteaiplus.cognitiveservices.azure.com/
AZURE_OPENAI_API_KEY = （実際のAPIキー）
AZURE_OPENAI_DEPLOYMENT_NAME = gpt-5-mini-2
```

**重要**: 
- `AZURE_OPENAI_DEPLOYMENT_NAME`は`gpt-5-mini-2`（デプロイメント名）であること
- 値が空でないこと
- 余分なスペースがないこと

### 2. Function Appの再起動

環境変数を設定または変更した場合：

1. Function Appの**概要**ページに戻る
2. **再起動**ボタンをクリック
3. 数分待つ（再起動が完了するまで）

### 3. AIチャットのテスト

1. Chrome拡張機能でAIチャットを送信
2. ログストリームで以下を確認：
   - `[CHAT] Request received`が表示されるか
   - エラーメッセージが表示されるか

## 期待される動作

### 正常な場合

ログストリームに以下が表示されます：

```
[CHAT] Request received
[CHAT] Sending X messages to model gpt-5-mini-2
[CHAT] Response payload: {...}
```

AIチャットが正常に応答を返します。

### エラーの場合

ログストリームに以下が表示されます：

```
[CHAT] Request received
[CHAT] Missing Azure OpenAI Credentials
または
[CHAT] OpenAI Error: ...
```

## 次のステップ

1. **環境変数を確認**
2. **Function Appを再起動**（必要に応じて）
3. **AIチャットをテスト**
4. **結果を共有**

