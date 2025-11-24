#!/bin/bash

# Azure Storage Account のテーブルを作成するスクリプト
# Stripeデータ保存用のテーブルを事前に作成

set -e

# 環境変数の読み込み
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

# Azure Storage Account情報
STORAGE_ACCOUNT_NAME="${AZURE_STORAGE_ACCOUNT_NAME:-stkarteai1763705952}"
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-karte-ai}"

# Connection Stringを取得
echo "Getting storage account connection string..."
CONNECTION_STRING=$(az storage account show-connection-string \
    --name "$STORAGE_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "connectionString" \
    -o tsv)

if [ -z "$CONNECTION_STRING" ]; then
    echo "Error: Failed to get storage account connection string"
    exit 1
fi

echo "Storage account: $STORAGE_ACCOUNT_NAME"
echo "Creating tables..."

# テーブル一覧
TABLES=(
    "Subscriptions"
    "StripeSubscriptions"
    "StripeCustomers"
    "PaymentHistory"
    "Users"
    "LogMetadata"
)

# 各テーブルを作成
for TABLE_NAME in "${TABLES[@]}"; do
    echo "Creating table: $TABLE_NAME"
    az storage table create \
        --name "$TABLE_NAME" \
        --connection-string "$CONNECTION_STRING" \
        --output none || {
        echo "Warning: Table $TABLE_NAME might already exist or creation failed"
    }
done

echo ""
echo "✅ Tables creation completed!"
echo ""
echo "Created tables:"
for TABLE_NAME in "${TABLES[@]}"; do
    echo "  - $TABLE_NAME"
done
