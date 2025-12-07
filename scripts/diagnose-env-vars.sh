#!/bin/bash

FUNCTION_APP_NAME="func-karte-ai-1763705952"
RESOURCE_GROUP="rg-karte-ai"

echo "=========================================="
echo "Karte AI+ 環境変数診断 (簡易版)"
echo "=========================================="
echo ""

echo "Checking App Settings..."
SETTINGS=$(az functionapp config appsettings list --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP -o json)

# 1. Check Sender Email
echo "--- [Email Configuration] ---"
SENDER=$(echo $SETTINGS | jq -r '.[] | select(.name=="SENDER_EMAIL_ADDRESS") | .value')
CONN_STR=$(echo $SETTINGS | jq -r '.[] | select(.name=="AZURE_COMMUNICATION_CONNECTION_STRING") | .value')

if [ -z "$SENDER" ] || [ "$SENDER" == "null" ]; then
  echo "❌ SENDER_EMAIL_ADDRESS が設定されていません。"
  echo "   コード内のデフォルト値 (DoNotReply@56e74c6e...) が使用されますが、"
  echo "   これはあなたのACSリソースとは異なるため、送信に失敗する可能性が高いです。"
  echo "   ACSの「ドメイン」で確認できる 'MailFrom' アドレスを設定してください。"
else
  echo "✅ SENDER_EMAIL_ADDRESS: $SENDER"
fi

if [ -z "$CONN_STR" ] || [ "$CONN_STR" == "null" ]; then
  echo "❌ AZURE_COMMUNICATION_CONNECTION_STRING が設定されていません。"
else
  echo "✅ AZURE_COMMUNICATION_CONNECTION_STRING is set."
fi

echo ""

# 2. Check OpenAI Model
echo "--- [AI Chat Configuration] ---"
DEPLOYMENT=$(echo $SETTINGS | jq -r '.[] | select(.name=="AZURE_OPENAI_DEPLOYMENT_NAME") | .value')
ENDPOINT=$(echo $SETTINGS | jq -r '.[] | select(.name=="AZURE_OPENAI_ENDPOINT") | .value')

if [ "$DEPLOYMENT" == "gpt-5-mini" ]; then
  echo "⚠️  AZURE_OPENAI_DEPLOYMENT_NAME が 'gpt-5-mini' になっています。"
  echo "   通常、Azure OpenAIにはこの名前のモデルは存在しません（gpt-4o-mini, gpt-35-turboなど）。"
  echo "   Azure OpenAI Studioでデプロイ名を確認し、正しい名前に変更してください。"
else
  echo "ℹ️  AZURE_OPENAI_DEPLOYMENT_NAME: $DEPLOYMENT"
fi

if [[ "$ENDPOINT" == *"<YOUR_"* ]]; then
 echo "❌ AZURE_OPENAI_ENDPOINT がプレースホルダーのままです。"
else
 echo "✅ AZURE_OPENAI_ENDPOINT is set."
fi

echo ""
echo "=========================================="
echo "診断完了"
