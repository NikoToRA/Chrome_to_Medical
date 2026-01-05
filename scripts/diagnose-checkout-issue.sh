#!/bin/bash

# 決済画面作成エラーの診断スクリプト
# 使用方法: ./scripts/diagnose-checkout-issue.sh

set -e

FUNCTION_APP_NAME="func-karte-ai-1763705952"
RESOURCE_GROUP="rg-karte-ai"
API_BASE_URL="https://${FUNCTION_APP_NAME}.azurewebsites.net/api"
LP_ORIGIN="https://stkarteai1763705952.z11.web.core.windows.net"

echo "=========================================="
echo "決済画面作成エラーの診断"
echo "=========================================="
echo ""

# 1. 環境変数の確認
echo "1. 環境変数の確認"
echo "----------------------------------------"
STRIPE_SECRET=$(az functionapp config appsettings list \
  --name ${FUNCTION_APP_NAME} \
  --resource-group ${RESOURCE_GROUP} \
  --query "[?name=='STRIPE_SECRET_KEY'].value" -o tsv 2>/dev/null || echo "")

STRIPE_PRICE=$(az functionapp config appsettings list \
  --name ${FUNCTION_APP_NAME} \
  --resource-group ${RESOURCE_GROUP} \
  --query "[?name=='STRIPE_PRICE_ID'].value" -o tsv 2>/dev/null || echo "")

if [ -z "$STRIPE_SECRET" ]; then
  echo "❌ STRIPE_SECRET_KEY が設定されていません"
else
  echo "✅ STRIPE_SECRET_KEY: ${STRIPE_SECRET:0:20}..."
fi

if [ -z "$STRIPE_PRICE" ]; then
  echo "❌ STRIPE_PRICE_ID が設定されていません"
else
  echo "✅ STRIPE_PRICE_ID: $STRIPE_PRICE"
fi
echo ""

# 2. CORS設定の確認
echo "2. CORS設定の確認"
echo "----------------------------------------"
CORS_ORIGINS=$(az functionapp cors show \
  --name ${FUNCTION_APP_NAME} \
  --resource-group ${RESOURCE_GROUP} \
  --query "allowedOrigins" -o tsv 2>/dev/null || echo "")

if echo "$CORS_ORIGINS" | grep -q "$LP_ORIGIN"; then
  echo "✅ CORS設定: $LP_ORIGIN が許可されています"
else
  echo "❌ CORS設定: $LP_ORIGIN が許可されていません"
  echo "   現在の設定: $CORS_ORIGINS"
fi
echo ""

# 3. APIエンドポイントのテスト
echo "3. APIエンドポイントのテスト"
echo "----------------------------------------"

# auth-send-magic-link のテスト
echo "3-1. auth-send-magic-link のテスト"
AUTH_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth-send-magic-link" \
  -H "Content-Type: application/json" \
  -H "Origin: ${LP_ORIGIN}" \
  -d '{
    "email":"test@example.com",
    "name":"テスト",
    "facilityName":"テストクリニック",
    "address":"東京都",
    "phone":"03-1234-5678"
  }' -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$AUTH_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
AUTH_BODY=$(echo "$AUTH_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ auth-send-magic-link: 成功"
  echo "   レスポンス: $AUTH_BODY"
else
  echo "❌ auth-send-magic-link: 失敗 (HTTP $HTTP_STATUS)"
  echo "   レスポンス: $AUTH_BODY"
fi
echo ""

# create-checkout-session のテスト
echo "3-2. create-checkout-session のテスト"
CHECKOUT_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/create-checkout-session" \
  -H "Content-Type: application/json" \
  -H "Origin: ${LP_ORIGIN}" \
  -d '{
    "email":"test@example.com",
    "name":"テスト",
    "facilityName":"テストクリニック",
    "address":"東京都",
    "phone":"03-1234-5678",
    "returnUrl":"'${LP_ORIGIN}'/success"
  }' -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$CHECKOUT_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
CHECKOUT_BODY=$(echo "$CHECKOUT_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  if echo "$CHECKOUT_BODY" | grep -q '"url"'; then
    echo "✅ create-checkout-session: 成功"
    echo "   レスポンス: $CHECKOUT_BODY" | head -c 200
    echo "..."
  else
    echo "⚠️  create-checkout-session: HTTP 200 だが、url フィールドが見つかりません"
    echo "   レスポンス: $CHECKOUT_BODY"
  fi
else
  echo "❌ create-checkout-session: 失敗 (HTTP $HTTP_STATUS)"
  echo "   レスポンス: $CHECKOUT_BODY"
fi
echo ""

# 4. 最近のエラーログの確認
echo "4. 最近のエラーログの確認"
echo "----------------------------------------"
echo "Application Insightsでエラーログを確認中..."
echo ""
echo "以下のコマンドで詳細を確認できます:"
echo "az monitor app-insights query \\"
echo "  --app ${FUNCTION_APP_NAME} \\"
echo "  --resource-group ${RESOURCE_GROUP} \\"
echo "  --analytics-query \"traces | where timestamp > ago(1h) and severityLevel > 2 | order by timestamp desc | take 10\""
echo ""

# 5. まとめ
echo "=========================================="
echo "診断完了"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "1. ブラウザの開発者ツール（F12）を開く"
echo "2. Consoleタブで [API] で始まるログを確認"
echo "3. Networkタブで create-checkout-session リクエストを確認"
echo "4. エラーメッセージの全文をコピー"
echo ""
echo "詳細は docs/DEBUGGING_GUIDE.md を参照してください"


