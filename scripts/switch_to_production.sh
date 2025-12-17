#!/bin/bash

# Configuration - Azure
FUNCTION_APP_NAME="func-karte-ai-1763705952" # Adjust if your function app name is different
RESOURCE_GROUP="rg-karte-ai"

echo "🚀 Switching to Stripe Production Mode"
echo "---------------------------------------"
echo "Please enter your LIVE Stripe keys from the Dashboard."
echo "Ensure you are viewing 'Live Mode' (Test Mode toggle OFF)."
echo ""

# 1. Secret Key
while true; do
    read -p "Enter STRIPE_SECRET_KEY (starts with sk_live_...): " SK_KEY
    if [[ $SK_KEY == sk_live_* ]]; then
        break
    else
        echo "❌ Invalid key format. Must start with 'sk_live_'."
    fi
done

# 2. Price ID
while true; do
    read -p "Enter STRIPE_PRICE_ID (starts with price_...): " PRICE_ID
    if [[ $PRICE_ID == price_* ]]; then
        break
    else
        echo "❌ Invalid ID format. Must start with 'price_'."
    fi
done

# 3. Webhook Secret
while true; do
    echo ""
    echo "ℹ️  Go to Dashboard > Developers > Webhooks"
    echo "    Add Endpoint: https://$FUNCTION_APP_NAME.azurewebsites.net/api/stripe-webhook"
    echo "    Events: invoice.payment_succeeded, customer.subscription.updated"
    echo ""
    read -p "Enter STRIPE_WEBHOOK_SECRET (starts with whsec_...): " WH_SECRET
    if [[ $WH_SECRET == whsec_* ]]; then
        break
    else
        echo "❌ Invalid secret format. Must start with 'whsec_'."
    fi
done

echo ""
echo "⏳ Updating Azure Function App settings..."

az functionapp config appsettings set \
    --name $FUNCTION_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
    STRIPE_SECRET_KEY="$SK_KEY" \
    STRIPE_PRICE_ID="$PRICE_ID" \
    STRIPE_WEBHOOK_SECRET="$WH_SECRET"

if [ $? -eq 0 ]; then
    echo "✅ Successfully switched to Production!"
    echo "Please test a real transaction (and refund it) to verify."
else
    echo "❌ Failed to update settings. Please check your Azure login (az login)."
fi
