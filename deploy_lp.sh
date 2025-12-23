#!/bin/bash

# Configuration
STORAGE_ACCOUNT_NAME="stkarteai1763705952"
RESOURCE_GROUP="rg-karte-ai" # Assuming this from setup_azure.sh, but name might be different. 
# Better to rely on account name which is unique.

echo "🚀 Starting deployment for Karte AI+ Landing Page..."

# Build the project
echo "📦 Building the project..."
cd landing-page-new
rm -rf dist
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Upload to Azure Storage
echo "☁️ Uploading to Azure Storage ($STORAGE_ACCOUNT_NAME)..."
az storage blob upload-batch \
    --destination '$web' \
    --source dist \
    --account-name $STORAGE_ACCOUNT_NAME \
    --overwrite

if [ $? -ne 0 ]; then
    echo "❌ Upload failed!"
    exit 1
fi

# Set Cache-Control for index.html to ensure users get the latest version
echo "🔄 Setting Cache-Control for index.html..."
az storage blob update \
    --account-name $STORAGE_ACCOUNT_NAME \
    --container-name '$web' \
    --name index.html \
    --content-cache-control "no-cache"

# Set Cache-Control for assets (long cache) could be done here too, but default is fine for now usually.

if [ $? -ne 0 ]; then
    echo "❌ Upload failed!"
    exit 1
fi

echo "✅ Deployment complete!"
echo "🌍 Site URL: https://$STORAGE_ACCOUNT_NAME.z11.web.core.windows.net/"
