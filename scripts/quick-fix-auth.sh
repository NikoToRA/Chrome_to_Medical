#!/bin/bash

# 最速で動かすための緊急修正スクリプト

FUNCTION_APP_NAME="func-karte-ai-1763705952"
RESOURCE_GROUP="rg-karte-ai"

echo "=========================================="
echo "緊急修正スクリプト - 最速で動かす"
echo "=========================================="
echo ""

# JWT_SECRETを取得
JWT_SECRET=$(az functionapp config appsettings list \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "[?name=='JWT_SECRET'].value" \
    --output tsv)

echo "JWT_SECRET: ${JWT_SECRET:0:20}..."
echo ""

# テストトークンを生成（auth-send-magic-linkと同じ方法で）
echo "テスト用のメールアドレスを入力してください:"
read -p "Email: " TEST_EMAIL

if [ -z "$TEST_EMAIL" ]; then
    echo "❌ メールアドレスが入力されていません"
    exit 1
fi

echo ""
echo "テストトークンを生成中..."

# Node.jsでトークンを生成
cd /Users/suguruhirayama/Chrome_to_Medical/azure-functions

TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const secret = '$JWT_SECRET';
const email = '$TEST_EMAIL';
const token = jwt.sign({ email }, secret, { expiresIn: '15m' });
console.log(token);
")

if [ -z "$TOKEN" ]; then
    echo "❌ トークンの生成に失敗しました"
    exit 1
fi

echo "✅ トークン生成成功"
echo ""

# テストURL
TEST_URL="https://${FUNCTION_APP_NAME}.azurewebsites.net/api/auth-verify-token?token=${TOKEN}"

echo "=========================================="
echo "テストURL:"
echo "=========================================="
echo "$TEST_URL"
echo ""
echo "このURLをブラウザで開いてください"
echo ""
echo "期待される動作:"
echo "1. Stripe Checkoutページに自動リダイレクト"
echo "2. または、エラーページが表示される"
echo ""

# 実際にテスト
read -p "curlでテストしますか？ (y/n): " TEST_CURL
if [ "$TEST_CURL" = "y" ]; then
    echo ""
    echo "curlでテスト中..."
    echo ""
    curl -i -L "$TEST_URL" 2>&1 | head -50
fi

echo ""
echo "=========================================="
echo "完了"
echo "=========================================="


