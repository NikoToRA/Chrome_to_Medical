# Azure Functions 500エラーの診断

## 問題の状況

- 動いていたコミットに戻しても同じ500エラーが発生
- Durationが4msで即座に失敗
- `[CHAT] Function entry point reached`のログが表示されない
- **→ Azure側の問題の可能性が高い**

## 確認すべきポイント

### 1. 環境変数の確認

Azure Portalで以下を確認：

1. **Azure Portal** → **Function App** (`func-karte-ai-1763705952`)
2. **設定** → **構成** → **アプリケーション設定**
3. 以下の環境変数が**正しく設定されているか**確認：

```
AZURE_OPENAI_ENDPOINT = https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY = your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME = gpt-5-mini
```

**重要**: 
- 値が空でないか確認
- 余分なスペースや改行がないか確認
- `AZURE_OPENAI_ENDPOINT`の末尾に`/`があるか確認

### 2. Azure OpenAIリソースの確認

1. **Azure Portal** → **Azure OpenAI**リソースを開く
2. **モデルのデプロイ**を確認
3. **`gpt-5-mini`というデプロイメントが存在するか**確認

**もし`gpt-5-mini`が存在しない場合:**
- デプロイメント名を確認（例: `gpt-4o-mini`、`gpt-4o`など）
- `AZURE_OPENAI_DEPLOYMENT_NAME`を正しいデプロイメント名に変更

### 3. Application Insightsで詳細なエラーを確認

1. **Azure Portal** → **Function App** → **監視** → **ログ**
2. 以下のクエリを実行：

```kusto
exceptions
| where timestamp > ago(10m)
| order by timestamp desc
| take 10
```

または：

```kusto
traces
| where timestamp > ago(10m)
| where severityLevel >= 3
| order by timestamp desc
| take 20
```

### 4. Function Appの再起動

環境変数を変更した場合、Function Appを再起動する必要があります：

1. **Azure Portal** → **Function App** → **概要**
2. **再起動**をクリック
3. 数分待ってから再度テスト

## よくある問題

### 問題1: 環境変数が設定されていない

**症状**: Durationが2-4msで即座に失敗

**対処法**:
1. 環境変数を設定
2. Function Appを再起動

### 問題2: デプロイメント名が間違っている

**症状**: `gpt-5-mini`が存在しない

**対処法**:
1. Azure OpenAI Studioでデプロイメント名を確認
2. `AZURE_OPENAI_DEPLOYMENT_NAME`を正しい値に変更
3. Function Appを再起動

### 問題3: APIキーが無効または期限切れ

**症状**: 認証エラー

**対処法**:
1. Azure OpenAI Studioで新しいAPIキーを取得
2. `AZURE_OPENAI_API_KEY`を更新
3. Function Appを再起動

## 次のステップ

1. **環境変数を確認**（特に`AZURE_OPENAI_DEPLOYMENT_NAME`）
2. **Azure OpenAIリソースでデプロイメント名を確認**
3. **Application Insightsでエラーの詳細を確認**
4. **Function Appを再起動**

これらの情報を共有してください。

