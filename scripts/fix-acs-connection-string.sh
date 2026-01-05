#!/bin/bash

# Azure Communication Services の接続文字列を修正するスクリプト
# 使用方法: ./scripts/fix-acs-connection-string.sh

set -e

FUNCTION_APP_NAME="func-karte-ai-1763705952"
RESOURCE_GROUP="rg-karte-ai"

echo "=========================================="
echo "Azure Communication Services 接続文字列の修正"
echo "=========================================="
echo ""

echo "現在の設定を確認中..."
CURRENT_VALUE=$(az functionapp config appsettings list \
  --name ${FUNCTION_APP_NAME} \
  --resource-group ${RESOURCE_GROUP} \
  --query "[?name=='AZURE_COMMUNICATION_CONNECTION_STRING'].value" -o tsv)

if [[ "$CURRENT_VALUE" == *"InstrumentationKey"* ]]; then
  echo "❌ 現在の値は Application Insights の接続文字列です"
  echo "   正しい Communication Services の接続文字列に変更する必要があります"
  echo ""
else
  echo "現在の値: ${CURRENT_VALUE:0:60}..."
  echo ""
fi

echo "【重要】正しい接続文字列を取得してください"
echo "----------------------------------------"
echo "1. Azure Portalで Communication Services リソース（acs-karte-ai）に移動"
echo "2. 左メニューから「キー」を選択"
echo "3. 「接続文字列」をコピー"
echo "   形式: endpoint=https://xxx.communication.azure.com/;accesskey=xxx"
echo ""
echo "⚠️ 注意: 「接続文字列」をコピーしてください。「主キー」や「セカンダリキー」ではありません"
echo ""

read -p "正しい接続文字列を貼り付けてください: " CORRECT_CONNECTION_STRING

if [ -z "$CORRECT_CONNECTION_STRING" ]; then
  echo "❌ 接続文字列が入力されていません"
  exit 1
fi

# 接続文字列の形式を確認
if [[ ! "$CORRECT_CONNECTION_STRING" == *"endpoint="* ]] || [[ ! "$CORRECT_CONNECTION_STRING" == *"accesskey="* ]]; then
  echo "⚠️ 警告: 接続文字列の形式が正しくない可能性があります"
  echo "   形式: endpoint=https://xxx.communication.azure.com/;accesskey=xxx"
  read -p "このまま続行しますか？ (y/n): " CONFIRM
  if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "キャンセルしました"
    exit 0
  fi
fi

echo ""
echo "接続文字列を更新中..."
az functionapp config appsettings set \
  --name ${FUNCTION_APP_NAME} \
  --resource-group ${RESOURCE_GROUP} \
  --settings AZURE_COMMUNICATION_CONNECTION_STRING="${CORRECT_CONNECTION_STRING}" \
  --output none

if [ $? -eq 0 ]; then
  echo "✅ 接続文字列を更新しました"
else
  echo "❌ 接続文字列の更新に失敗しました"
  exit 1
fi

echo ""
echo "設定を確認中..."
az functionapp config appsettings list \
  --name ${FUNCTION_APP_NAME} \
  --resource-group ${RESOURCE_GROUP} \
  --query "[?name=='AZURE_COMMUNICATION_CONNECTION_STRING' || name=='EMAIL_SENDER_ADDRESS'].{name:name, value:value}" \
  -o table

echo ""
echo "Function Appを再起動中..."
az functionapp restart \
  --name ${FUNCTION_APP_NAME} \
  --resource-group ${RESOURCE_GROUP} \
  --output none

if [ $? -eq 0 ]; then
  echo "✅ Function Appを再起動しました"
else
  echo "❌ Function Appの再起動に失敗しました"
  exit 1
fi

echo ""
echo "=========================================="
echo "✅ 修正完了！"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "1. ランディングページでテスト送信"
echo "2. メールボックスを確認"
echo "=========================================="


