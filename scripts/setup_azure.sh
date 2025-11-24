#!/bin/bash

# 設定
RESOURCE_GROUP_NAME="rg-karte-ai"
LOCATION="japaneast" # 日本（東京）
STORAGE_ACCOUNT_NAME="stkarteai$(date +%s)" # 一意にするためにタイムスタンプ付与
FUNCTION_APP_NAME="func-karte-ai-$(date +%s)" # 一意にするためにタイムスタンプ付与

echo "🚀 Karte AI+ Azure構築スクリプトを開始します..."

# 1. リソースグループの作成
echo "📦 リソースグループ ($RESOURCE_GROUP_NAME) を作成中..."
az group create --name $RESOURCE_GROUP_NAME --location $LOCATION

# 2. Storage Accountの作成 (Standard_LRS: 最も安価な構成)
echo "💾 Storage Account ($STORAGE_ACCOUNT_NAME) を作成中..."
az storage account create \
  --name $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP_NAME \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

# 接続文字列の取得
echo "🔑 Storage Connection String を取得中..."
CONNECTION_STRING=$(az storage account show-connection-string --name $STORAGE_ACCOUNT_NAME --resource-group $RESOURCE_GROUP_NAME --query connectionString --output tsv)

# 3. Function Appの作成 (Consumption Plan: サーバーレス・従量課金)
echo "⚡ Function App ($FUNCTION_APP_NAME) を作成中..."
az functionapp create \
  --name $FUNCTION_APP_NAME \
  --storage-account $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP_NAME \
  --consumption-plan-location $LOCATION \
  --runtime node \
  --runtime-version 20 \
  --os-type Linux \
  --functions-version 4

# 4. 環境変数の設定
echo "⚙️ 環境変数を設定中..."
az functionapp config appsettings set --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP_NAME --settings \
  AZURE_STORAGE_CONNECTION_STRING="$CONNECTION_STRING" \
  AZURE_OPENAI_ENDPOINT="<YOUR_AZURE_OPENAI_ENDPOINT>" \
  AZURE_OPENAI_API_KEY="<YOUR_AZURE_OPENAI_API_KEY>" \
  AZURE_OPENAI_DEPLOYMENT_NAME="gpt-5-mini" \
  STRIPE_SECRET_KEY="<YOUR_STRIPE_SECRET_KEY>" \
  STRIPE_WEBHOOK_SECRET="<YOUR_STRIPE_WEBHOOK_SECRET>" \
  STRIPE_PRICE_ID="<YOUR_STRIPE_PRICE_ID>"

echo "✅ 構築が完了しました！"
echo "--------------------------------------------------"
echo "Resource Group: $RESOURCE_GROUP_NAME"
echo "Storage Account: $STORAGE_ACCOUNT_NAME"
echo "Function App: $FUNCTION_APP_NAME"
echo "URL: https://$FUNCTION_APP_NAME.azurewebsites.net"
echo "--------------------------------------------------"
echo "⚠️ 注意: Azure Portal または VS Code から、設定されたプレースホルダー（<YOUR_...>）を実際のキーに更新してください。"
