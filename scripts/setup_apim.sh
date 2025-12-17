#!/bin/bash

# Configuration
RESOURCE_GROUP="rg-karte-ai"
APIM_NAME="apim-karte-ai-1763705952"
API_ID="karte-ai-api"
API_PATH="api"
BACKEND_URL="https://func-karte-ai-1763705952.azurewebsites.net/api"
POLICY_COMBINED="./apim-configuration/combined-policy.xml"

echo "Configuring API Management: $APIM_NAME"

# 1. Create API
echo "Creating API definition..."
az apim api create --resource-group $RESOURCE_GROUP \
    --service-name $APIM_NAME \
    --api-id $API_ID \
    --display-name "Karte AI API" \
    --path $API_PATH \
    --service-url $BACKEND_URL \
    --protocols https

# 2. Configure Global Policy (CORS + Rate Limit)
echo "Applying Combined Policy..."
az apim api policy update --resource-group $RESOURCE_GROUP \
    --service-name $APIM_NAME \
    --api-id $API_ID \
    --xml-content @$POLICY_COMBINED

# Helper function to create operation
create_op() {
    local method=$1
    local name=$2
    local url=$3
    echo "Creating operation: $method $url ($name)"
    # Delete existing if method changed (Naive approach: try delete GET if creating POST for same url, etc)
    # But simpler: just try create, if fail, assume exists.
    # However, for Check Subscription we renamed method.
    az apim api operation create --resource-group $RESOURCE_GROUP \
        --service-name $APIM_NAME \
        --api-id $API_ID \
        --url-template "$url" \
        --method "$method" \
        --display-name "$name" || echo "Operation might already exist or failed"
}

# System
create_op "GET" "Health Check" "/health"

# Auth
create_op "POST" "Send Magic Link" "/auth-send-magic-link"
create_op "POST" "Verify Token" "/auth-verify-token"

# User / Subscription
# Special handling: Remove GET operation for check-subscription if it exists (from previous run)
az apim api operation delete --resource-group $RESOURCE_GROUP \
    --service-name $APIM_NAME \
    --api-id $API_ID \
    --operation-id 715f81349dbd4d06957fe3e7f1084f7a -y || echo "GET operation not found or already deleted"

create_op "POST" "Check Subscription" "/check-subscription"
create_op "POST" "Cancel Subscription" "/cancel-subscription"
create_op "POST" "Create Checkout Session" "/create-checkout-session"
create_op "POST" "Create Portal Session" "/create-portal-session"

# Core
create_op "POST" "Chat" "/chat"
create_op "POST" "Save Log" "/save-log"
create_op "POST" "Log Insertion" "/log-insertion"

# 4. Apply Rate Limit Policy
# This can be applied at Product level or API level.
# Applying at API level combined with CORS.
# Note: Since we already applied CORS, we should merge or append.
# Current policy file for rate limit is full policy xml.
# We should probably combine them into one file or apply rate limit to specific sensitive operations.

# For simplicity, let's assume one main policy file for the API.
# I will merge rate limit into the CORS policy file logic or add it as a separate step if merging is needed.
# For now, let's just log that we need to ensure the policy includes both.

echo "Configuration script completed."
