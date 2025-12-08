#!/bin/bash

# Configuration
STORAGE_ACCOUNT_NAME="stkarteai1763705952"

echo "🔙 Reverting deployment to Old LP (Registration Form)..."

# Build the OLD project
echo "📦 Building 'landing-page' (Old LP)..."
cd landing-page
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

echo "✅ Revert complete! The site should now show the Registration Form."
echo "🌍 Site URL: https://$STORAGE_ACCOUNT_NAME.z11.web.core.windows.net/"
