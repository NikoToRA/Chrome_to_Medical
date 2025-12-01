#!/bin/bash

# Azure Communication Services メール送信の環境変数設定スクリプト
# 使用方法: ./scripts/setup-acs-email.sh

set -e

FUNCTION_APP_NAME="func-karte-ai-1763705952"
RESOURCE_GROUP="rg-karte-ai"
COMMUNICATION_SERVICE_NAME="acs-karte-ai"

echo "=========================================="
echo "Azure Communication Services メール設定"
echo "=========================================="
echo ""

# ステップ1: 接続文字列を取得
echo "1. 接続文字列を取得中..."
echo "----------------------------------------"
echo "Azure Portalで接続文字列を取得してください:"
echo "1. Communication Services リソース（${COMMUNICATION_SERVICE_NAME}）に移動"
echo "2. 左メニューから「キー」を選択"
echo "3. 「接続文字列」をコピー"
echo ""
read -p "接続文字列を貼り付けてください: " CONNECTION_STRING

if [ -z "$CONNECTION_STRING" ]; then
  echo "❌ 接続文字列が入力されていません"
  exit 1
fi
echo ""

# ステップ2: 送信者アドレスを確認
echo "2. 送信者アドレスを確認"
echo "----------------------------------------"
echo "「Try Email」で使用した送信者アドレスを確認してください"
echo ""
echo "画面から確認できる情報:"
echo "- Send email from: 56e74c6e-f57a-4dfe-9bfc-b6a2157f6e40.azurecomm.net"
echo "- Sender email username: DoNotReply"
echo ""
echo "送信者アドレスは以下の形式になります:"
echo "DoNotReply@56e74c6e-f57a-4dfe-9bfc-b6a2157f6e40.azurecomm.net"
echo ""

# デフォルト値を提案
DEFAULT_SENDER="DoNotReply@56e74c6e-f57a-4dfe-9bfc-b6a2157f6e40.azurecomm.net"
read -p "送信者アドレスを入力してください [${DEFAULT_SENDER}]: " SENDER_ADDRESS
SENDER_ADDRESS=${SENDER_ADDRESS:-$DEFAULT_SENDER}

echo ""
echo "設定する値:"
echo "  接続文字列: ${CONNECTION_STRING:0:50}..."
echo "  送信者アドレス: ${SENDER_ADDRESS}"
echo ""

read -p "この設定で環境変数を設定しますか？ (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "キャンセルしました"
  exit 0
fi

# ステップ3: 環境変数を設定
echo ""
echo "3. 環境変数を設定中..."
echo "----------------------------------------"

# 接続文字列を設定
echo "接続文字列を設定中..."
az functionapp config appsettings set \
  --name ${FUNCTION_APP_NAME} \
  --resource-group ${RESOURCE_GROUP} \
  --settings AZURE_COMMUNICATION_CONNECTION_STRING="${CONNECTION_STRING}" \
  --output none

if [ $? -eq 0 ]; then
  echo "✅ AZURE_COMMUNICATION_CONNECTION_STRING を設定しました"
else
  echo "❌ 接続文字列の設定に失敗しました"
  exit 1
fi

# 送信者アドレスを設定
echo "送信者アドレスを設定中..."
az functionapp config appsettings set \
  --name ${FUNCTION_APP_NAME} \
  --resource-group ${RESOURCE_GROUP} \
  --settings EMAIL_SENDER_ADDRESS="${SENDER_ADDRESS}" \
  --output none

if [ $? -eq 0 ]; then
  echo "✅ EMAIL_SENDER_ADDRESS を設定しました"
else
  echo "❌ 送信者アドレスの設定に失敗しました"
  exit 1
fi

# ステップ4: 環境変数の確認
echo ""
echo "4. 設定を確認中..."
echo "----------------------------------------"
az functionapp config appsettings list \
  --name ${FUNCTION_APP_NAME} \
  --resource-group ${RESOURCE_GROUP} \
  --query "[?name=='AZURE_COMMUNICATION_CONNECTION_STRING' || name=='EMAIL_SENDER_ADDRESS'].{name:name, value:value}" \
  -o table

# ステップ5: Function Appを再起動
echo ""
echo "5. Function Appを再起動中..."
echo "----------------------------------------"
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
echo "✅ 設定完了！"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "1. ランディングページにアクセス:"
echo "   https://stkarteai1763705952.z11.web.core.windows.net"
echo ""
echo "2. フォームに入力して送信"
echo ""
echo "3. メールボックスを確認"
echo ""
echo "4. メールが届いていることを確認"
echo "=========================================="

