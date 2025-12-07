#!/bin/bash
set -e

FUNCTION_APP_NAME="func-karte-ai-1763705952"
RESOURCE_GROUP="rg-karte-ai"
ACS_NAME="acs-karte-ai"
EMAIL_SERVICE_NAME="email-karte-ai"
DOMAIN_NAME="AzureManagedDomain"

echo "🚀 Azure設定の自動修復を開始します..."

# 1. ACS接続文字列の取得
echo "🔑 Azure Communication Services (ACS) の接続文字列を取得中..."
ACS_CONN_STR=$(az communication list-key --name $ACS_NAME --resource-group $RESOURCE_GROUP --query "primaryConnectionString" -o tsv)

if [ -z "$ACS_CONN_STR" ]; then
    echo "❌ ACS接続文字列の取得に失敗しました。"
    exit 1
fi

# 2. 送信元メールドメインの取得
echo "📧 Email Serviceドメインを取得中..."
DOMAIN=$(az communication email domain show --name $DOMAIN_NAME --email-service-name $EMAIL_SERVICE_NAME --resource-group $RESOURCE_GROUP --query "fromSenderDomain" -o tsv)

if [ -z "$DOMAIN" ]; then
    echo "❌ ドメイン情報の取得に失敗しました。"
    exit 1
fi

SENDER_ADDRESS="DoNotReply@${DOMAIN}"
echo "   送信元アドレス: $SENDER_ADDRESS"

# 3. 設定の更新
echo "⚙️ Function Appの設定を更新中..."
az functionapp config appsettings set --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP --settings \
    AZURE_COMMUNICATION_CONNECTION_STRING="$ACS_CONN_STR" \
    SENDER_EMAIL_ADDRESS="$SENDER_ADDRESS" \
    AZURE_OPENAI_DEPLOYMENT_NAME="gpt-5-mini-2"

echo "🔄 Function Appを再起動中..."
az functionapp restart --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP

echo "✅ 完了しました！以下の設定が適用されました:"
echo "   - AZURE_COMMUNICATION_CONNECTION_STRING: (更新済み)"
echo "   - SENDER_EMAIL_ADDRESS: $SENDER_ADDRESS"
echo "   - AZURE_OPENAI_DEPLOYMENT_NAME: gpt-5-mini-2"
