#!/bin/bash

# auth-verify-token のテストスクリプト

FUNCTION_APP_NAME="func-karte-ai-1763705952"
RESOURCE_GROUP="rg-karte-ai"

echo "=========================================="
echo "auth-verify-token テストスクリプト"
echo "=========================================="
echo ""

# テスト用のメールアドレス
read -p "テスト用のメールアドレスを入力してください: " test_email

if [ -z "$test_email" ]; then
    echo "❌ メールアドレスが入力されていません"
    exit 1
fi

# JWT_SECRETを取得
echo "環境変数を取得中..."
jwt_secret=$(az functionapp config appsettings list \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "[?name=='JWT_SECRET'].value" \
    --output tsv 2>/dev/null)

if [ -z "$jwt_secret" ]; then
    echo "❌ JWT_SECRETが設定されていません"
    exit 1
fi

# Node.jsでトークンを生成
echo ""
echo "テストトークンを生成中..."

# 一時的なNode.jsスクリプトを作成
cat > /tmp/generate_test_token.js << 'EOF'
const jwt = require('jsonwebtoken');
const secret = process.argv[2];
const email = process.argv[3];

// Magic Linkトークン（15分有効）
const token = jwt.sign(
    { email: email },
    secret,
    { expiresIn: '15m' }
);

console.log(token);
EOF

# トークンを生成
token=$(node /tmp/generate_test_token.js "$jwt_secret" "$test_email" 2>/dev/null)

if [ -z "$token" ]; then
    echo "❌ トークンの生成に失敗しました"
    echo ""
    echo "Node.jsとjsonwebtokenパッケージが必要です:"
    echo "  cd azure-functions"
    echo "  npm install jsonwebtoken"
    rm -f /tmp/generate_test_token.js
    exit 1
fi

# テストURLを生成
test_url="https://${FUNCTION_APP_NAME}.azurewebsites.net/api/auth-verify-token?token=${token}"

echo ""
echo "✅ テストトークン生成完了"
echo ""
echo "=========================================="
echo "テストURL:"
echo "=========================================="
echo "$test_url"
echo ""
echo "このURLをブラウザで開いて動作を確認してください。"
echo ""
echo "期待される動作:"
echo "1. Stripe Checkoutページに自動リダイレクトされる"
echo "2. または、エラーページが表示される（その場合はログを確認）"
echo ""

# クリーンアップ
rm -f /tmp/generate_test_token.js

# 実際にcurlでテストするか確認
read -p "curlでテストしますか？ (y/n): " test_curl
if [ "$test_curl" = "y" ]; then
    echo ""
    echo "curlでテスト中..."
    echo ""
    
    response=$(curl -s -i -L "$test_url" 2>&1)
    
    echo "=========================================="
    echo "レスポンス:"
    echo "=========================================="
    echo "$response"
    echo ""
    
    # HTTPステータスコードを抽出
    status_code=$(echo "$response" | grep -i "HTTP/" | head -1 | awk '{print $2}')
    
    if [ "$status_code" = "302" ]; then
        location=$(echo "$response" | grep -i "Location:" | awk '{print $2}' | tr -d '\r')
        echo "✅ リダイレクト成功 (302)"
        echo "リダイレクト先: $location"
        if [[ "$location" == *"checkout.stripe.com"* ]]; then
            echo "✅ Stripe Checkoutへのリダイレクトが確認されました"
        else
            echo "⚠️  予期しないリダイレクト先です"
        fi
    elif [ "$status_code" = "200" ]; then
        echo "⚠️  HTMLページが返されました（フォールバックページの可能性）"
        echo "Application Insightsでログを確認してください"
    else
        echo "❌ エラー: HTTPステータスコード $status_code"
        echo "Application Insightsでログを確認してください"
    fi
fi

echo ""
echo "=========================================="
echo "テスト完了"
echo "=========================================="

