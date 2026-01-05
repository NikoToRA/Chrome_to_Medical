#!/bin/bash

# auth-verify-token の診断スクリプト

FUNCTION_APP_NAME="func-karte-ai-1763705952"
RESOURCE_GROUP="rg-karte-ai"

echo "=========================================="
echo "auth-verify-token 診断スクリプト"
echo "=========================================="
echo ""

# 1. 環境変数の確認
echo "【1】環境変数の確認"
echo "----------------------------------------"
echo ""

REQUIRED_VARS=(
    "JWT_SECRET"
    "STRIPE_SECRET_KEY"
    "STRIPE_PRICE_ID"
    "SUCCESS_PAGE_URL"
    "CANCEL_PAGE_URL"
)

for var in "${REQUIRED_VARS[@]}"; do
    value=$(az functionapp config appsettings list \
        --name "$FUNCTION_APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "[?name=='$var'].value" \
        --output tsv 2>/dev/null)
    
    if [ -z "$value" ]; then
        echo "❌ $var: 設定されていません"
    else
        # 機密情報は一部のみ表示
        if [[ "$var" == *"SECRET"* ]] || [[ "$var" == *"KEY"* ]]; then
            echo "✅ $var: ${value:0:20}... (設定済み)"
        else
            echo "✅ $var: $value"
        fi
    fi
done

echo ""
echo "【2】Function Appの状態確認"
echo "----------------------------------------"
echo ""

# Function Appの状態
status=$(az functionapp show \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "state" \
    --output tsv 2>/dev/null)

echo "Function App状態: $status"

if [ "$status" != "Running" ]; then
    echo "⚠️  Function Appが実行されていません。再起動が必要です。"
    echo ""
    read -p "再起動しますか？ (y/n): " restart
    if [ "$restart" = "y" ]; then
        echo "Function Appを再起動中..."
        az functionapp restart \
            --name "$FUNCTION_APP_NAME" \
            --resource-group "$RESOURCE_GROUP"
        echo "✅ 再起動完了。数分待ってから再度テストしてください。"
    fi
fi

echo ""
echo "【3】テストトークンの生成（オプション）"
echo "----------------------------------------"
echo ""

read -p "テストトークンを生成して動作確認しますか？ (y/n): " test
if [ "$test" = "y" ]; then
    echo ""
    echo "テスト用のメールアドレスを入力してください:"
    read -p "Email: " test_email
    
    if [ -z "$test_email" ]; then
        echo "❌ メールアドレスが入力されていません"
        exit 1
    fi
    
    # JWT_SECRETを取得
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
    cat > /tmp/generate_test_token.js << EOF
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
        echo "Node.jsとjsonwebtokenパッケージが必要です:"
        echo "  npm install jsonwebtoken"
        exit 1
    fi
    
    # テストURLを生成
    test_url="https://${FUNCTION_APP_NAME}.azurewebsites.net/api/auth-verify-token?token=${token}"
    
    echo ""
    echo "✅ テストトークン生成完了"
    echo ""
    echo "テストURL:"
    echo "$test_url"
    echo ""
    echo "このURLをブラウザで開いて動作を確認してください。"
    echo ""
    
    # クリーンアップ
    rm -f /tmp/generate_test_token.js
fi

echo ""
echo "【4】Application Insightsログの確認方法"
echo "----------------------------------------"
echo ""
echo "Azure Portalで以下のクエリを実行してください:"
echo ""
echo "traces"
echo "| where timestamp > ago(10m)"
echo "| where message contains \"AuthVerifyToken\""
echo "| order by timestamp desc"
echo "| take 20"
echo ""
echo "または、エラーのみを確認:"
echo ""
echo "exceptions"
echo "| where timestamp > ago(10m)"
echo "| order by timestamp desc"
echo "| take 10"
echo ""

echo "=========================================="
echo "診断完了"
echo "=========================================="


