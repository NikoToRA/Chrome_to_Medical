#!/bin/bash

# auth-verify-tokenのログを確認するスクリプト

FUNCTION_APP_NAME="func-karte-ai-1763705952"
RESOURCE_GROUP="rg-karte-ai"

echo "=========================================="
echo "auth-verify-token ログ確認スクリプト"
echo "=========================================="
echo ""

# Application InsightsのApp IDを取得
echo "【1】Application Insightsの情報を取得中..."
echo "----------------------------------------"

APP_ID=$(az functionapp show \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "applicationId" \
    --output tsv 2>/dev/null)

if [ -z "$APP_ID" ]; then
    echo "❌ Application InsightsのApp IDを取得できませんでした"
    echo ""
    echo "Azure Portalで直接確認してください:"
    echo "1. Azure Portal → Function App ($FUNCTION_APP_NAME)"
    echo "2. 監視 → ログ"
    echo "3. 以下のクエリを実行:"
    echo ""
    echo "traces"
    echo "| where timestamp > ago(30m)"
    echo "| where message contains \"AuthVerifyToken\""
    echo "| order by timestamp desc"
    echo "| take 50"
    exit 1
fi

echo "✅ Application Insights App ID: $APP_ID"
echo ""

# ログをクエリ
echo "【2】最近のauth-verify-tokenのログを取得中..."
echo "----------------------------------------"
echo ""

QUERY="traces | where timestamp > ago(30m) | where message contains 'AuthVerifyToken' or operation_Name contains 'auth-verify-token' | order by timestamp desc | take 20"

az monitor app-insights query \
    --app "$APP_ID" \
    --analytics-query "$QUERY" \
    --output table 2>/dev/null

if [ $? -ne 0 ]; then
    echo "❌ ログの取得に失敗しました"
    echo ""
    echo "Azure Portalで直接確認してください:"
    echo "1. Azure Portal → Function App ($FUNCTION_APP_NAME)"
    echo "2. 監視 → ログ"
    echo "3. 以下のクエリを実行:"
    echo ""
    echo "$QUERY"
    exit 1
fi

echo ""
echo "【3】エラーログを確認中..."
echo "----------------------------------------"
echo ""

ERROR_QUERY="traces | where timestamp > ago(30m) | where (message contains 'AuthVerifyToken' or operation_Name contains 'auth-verify-token') | where severityLevel >= 3 | order by timestamp desc | take 10"

az monitor app-insights query \
    --app "$APP_ID" \
    --analytics-query "$ERROR_QUERY" \
    --output table 2>/dev/null

echo ""
echo "【4】401エラーのリクエストを確認中..."
echo "----------------------------------------"
echo ""

REQUEST_QUERY="requests | where timestamp > ago(30m) | where url contains 'auth-verify-token' | where resultCode == 401 | order by timestamp desc | take 10 | project timestamp, url, resultCode, duration"

az monitor app-insights query \
    --app "$APP_ID" \
    --analytics-query "$REQUEST_QUERY" \
    --output table 2>/dev/null

echo ""
echo "=========================================="
echo "ログ確認完了"
echo "=========================================="
echo ""
echo "より詳細なログを確認するには、Azure Portalで以下を実行してください:"
echo ""
echo "1. Azure Portal → Function App ($FUNCTION_APP_NAME)"
echo "2. 監視 → ログ"
echo "3. 以下のクエリを実行:"
echo ""
echo "traces"
echo "| where timestamp > ago(30m)"
echo "| where message contains \"AuthVerifyToken\""
echo "| order by timestamp desc"
echo "| take 50"
echo ""
echo "詳細は docs/APPLICATION_INSIGHTS_AUTH_VERIFY_TOKEN.md を参照してください"
echo "=========================================="


