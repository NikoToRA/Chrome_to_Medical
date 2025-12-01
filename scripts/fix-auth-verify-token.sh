#!/bin/bash

# auth-verify-token 401エラー修正スクリプト

FUNCTION_APP_NAME="func-karte-ai-1763705952"
RESOURCE_GROUP="rg-karte-ai"

echo "=========================================="
echo "auth-verify-token 401エラー修正スクリプト"
echo "=========================================="
echo ""

# 1. 現在のディレクトリを確認
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FUNCTIONS_DIR="$PROJECT_ROOT/azure-functions"

if [ ! -d "$FUNCTIONS_DIR" ]; then
    echo "❌ azure-functions ディレクトリが見つかりません"
    exit 1
fi

# 2. Function Appの状態を確認
echo "【1】Function Appの状態を確認中..."
echo "----------------------------------------"
status=$(az functionapp show \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "state" \
    --output tsv 2>/dev/null)

if [ -z "$status" ]; then
    echo "❌ Function Appが見つかりません"
    exit 1
fi

echo "Function App状態: $status"
echo ""

# 3. JWT_SECRETを確認
echo "【2】JWT_SECRETを確認中..."
echo "----------------------------------------"
jwt_secret=$(az functionapp config appsettings list \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "[?name=='JWT_SECRET'].value" \
    --output tsv 2>/dev/null)

if [ -z "$jwt_secret" ]; then
    echo "❌ JWT_SECRETが設定されていません"
    exit 1
fi

echo "✅ JWT_SECRET: ${jwt_secret:0:20}... (設定済み)"
echo ""

# 4. Function Appを再デプロイ
echo "【3】Function Appを再デプロイ中..."
echo "----------------------------------------"
echo "⚠️  これには数分かかることがあります"
echo ""

cd "$FUNCTIONS_DIR"

# Azure Functions Core Toolsがインストールされているか確認
if ! command -v func &> /dev/null; then
    echo "❌ Azure Functions Core Toolsがインストールされていません"
    echo "インストール方法: npm install -g azure-functions-core-tools@4"
    exit 1
fi

echo "デプロイを開始します..."
func azure functionapp publish "$FUNCTION_APP_NAME" --build remote

if [ $? -ne 0 ]; then
    echo "❌ デプロイに失敗しました"
    exit 1
fi

echo ""
echo "✅ デプロイ完了"
echo ""

# 5. Function Appを再起動
echo "【4】Function Appを再起動中..."
echo "----------------------------------------"
az functionapp restart \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP"

if [ $? -ne 0 ]; then
    echo "❌ 再起動に失敗しました"
    exit 1
fi

echo "✅ 再起動完了"
echo ""

# 6. 待機
echo "【5】Function Appの起動を待機中..."
echo "----------------------------------------"
echo "数秒待機します..."
sleep 10

# 7. 結果を表示
echo ""
echo "=========================================="
echo "✅ 修正完了！"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "1. 新しいMagic Linkをリクエストしてください"
echo "2. Magic Linkをクリックして動作を確認してください"
echo ""
echo "期待される動作:"
echo "- Magic Linkクリック → Stripe Checkoutに自動リダイレクト"
echo "- または、改善されたエラーページが表示される"
echo ""
echo "問題が続く場合は、Application Insightsでログを確認してください:"
echo "Azure Portal → Function App → 監視 → ログ"
echo "=========================================="

