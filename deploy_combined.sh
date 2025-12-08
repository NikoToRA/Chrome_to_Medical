#!/bin/bash

# Configuration
STORAGE_ACCOUNT_NAME="stkarteai1763705952"

echo "🚀 Starting combined deployment (New LP + Old LP as /register)..."

# 1. Build LPnew (Root)
echo "📦 Building New LP (Root)..."
cd landing-page-new
npm run build
if [ $? -ne 0 ]; then
    echo "❌ New LP Build failed!"
    exit 1
fi
cd ..

# 2. Build LPold (/register)
echo "📦 Building Old LP (/register)..."
cd landing-page
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Old LP Build failed!"
    exit 1
fi
cd ..

# 3. Combine Artifacts
echo "🔄 Combining artifacts..."
# Ensure the destination directory exists
mkdir -p landing-page-new/dist/register

# Copy Old LP dist to New LP dist/register
# Note: We use rsync or cp -r.
cp -r landing-page/dist/* landing-page-new/dist/register/

# 4. Upload to Azure Storage
echo "☁️ Uploading to Azure Storage ($STORAGE_ACCOUNT_NAME)..."
# We upload the contents of landing-page-new/dist to the root of $web
az storage blob upload-batch \
    --destination '$web' \
    --source landing-page-new/dist \
    --account-name $STORAGE_ACCOUNT_NAME \
    --overwrite

if [ $? -ne 0 ]; then
    echo "❌ Upload failed!"
    exit 1
fi

echo "✅ Deployment complete!"
echo "🌍 Root (New LP): https://$STORAGE_ACCOUNT_NAME.z11.web.core.windows.net/"
echo "📝 Register (Old LP): https://$STORAGE_ACCOUNT_NAME.z11.web.core.windows.net/register/"
