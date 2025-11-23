# Azure Functions 環境変数設定手順

## 確認された情報

画像から以下の情報が確認できました：

- **デプロイメント名**: `gpt-5-mini-2`
- **エンドポイント**: `https://karteaiplus.cognitiveservices.azure.com/`
- **モデル名**: `gpt-5-mini`

## 環境変数の設定

Azure Portalで以下を設定してください：

### ステップ1: Function Appの設定を開く

1. Azure Portal → Function App (`func-karte-ai-1763705952`)
2. **設定** → **構成** → **アプリケーション設定**

### ステップ2: 環境変数を設定

以下の3つの環境変数を設定または確認：

#### 1. AZURE_OPENAI_ENDPOINT
- **名前**: `AZURE_OPENAI_ENDPOINT`
- **値**: `https://karteaiplus.cognitiveservices.azure.com/`
- **重要**: 末尾に`/`を含める

#### 2. AZURE_OPENAI_API_KEY
- **名前**: `AZURE_OPENAI_API_KEY`
- **値**: Azure OpenAIリソースのキー（画像の「キー」から取得）

#### 3. AZURE_OPENAI_DEPLOYMENT_NAME
- **名前**: `AZURE_OPENAI_DEPLOYMENT_NAME`
- **値**: `gpt-5-mini-2`
- **重要**: デプロイメント名（モデル名ではない）

#### 4. AZURE_INSERTION_CONTAINER
- **名前**: `AZURE_INSERTION_CONTAINER`
- **値**: `clinical-insertions`（任意のBlobコンテナ名。事前に作成済みのものを指定可能）
- **役割**: カルテへの貼り付け/コピー内容をJSONでアーカイブするコンテナ

### ステップ3: 保存と再起動

1. **保存**をクリック
2. Function Appを**再起動**
3. 数分待ってからテスト

## Azure CLIでの設定（代替方法）

```bash
# エンドポイントを設定
az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group DefaultResourceGroup-EJP \
  --settings "AZURE_OPENAI_ENDPOINT=https://karteaiplus.cognitiveservices.azure.com/"

# APIキーを設定（実際のキーに置き換えてください）
az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group DefaultResourceGroup-EJP \
  --settings "AZURE_OPENAI_API_KEY=your-actual-api-key"

# デプロイメント名を設定
az functionapp config appsettings set \
  --name func-karte-ai-1763705952 \
  --resource-group DefaultResourceGroup-EJP \
  --settings "AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5-mini-2"
```

## 確認方法

設定後、以下のコマンドで確認：

```bash
az functionapp config appsettings list \
  --name func-karte-ai-1763705952 \
  --resource-group DefaultResourceGroup-EJP \
  --query "[?name=='AZURE_OPENAI_ENDPOINT' || name=='AZURE_OPENAI_API_KEY' || name=='AZURE_OPENAI_DEPLOYMENT_NAME'].{name:name, value:value}" \
  -o table
```

## 次のステップ

1. 環境変数を設定
2. Function Appを再起動
3. AIチャットをテスト

