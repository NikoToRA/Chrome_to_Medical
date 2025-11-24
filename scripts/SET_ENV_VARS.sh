#!/bin/bash

# Azure Function App Name
APP_NAME="func-karte-ai-1763705952"
RESOURCE_GROUP="rg-karte-ai"

# Secrets - PLEASE FILL THESE IN
# You can get SendGrid Key from SendGrid Dashboard
# You can generate a random string for JWT_SECRET
# You can get Stripe keys from Stripe Dashboard
SENDGRID_API_KEY=""
JWT_SECRET=""
STRIPE_SECRET_KEY=""
STRIPE_PRICE_ID=""
STRIPE_WEBHOOK_SECRET=""

# Check if variables are set
if [ -z "$SENDGRID_API_KEY" ] || [ -z "$JWT_SECRET" ] || [ -z "$STRIPE_SECRET_KEY" ] || [ -z "$STRIPE_PRICE_ID" ] || [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
    echo "Error: Please edit this script and fill in the secret variables before running."
    echo "Open 'SET_ENV_VARS.sh' in your editor."
    exit 1
fi

echo "Setting environment variables for $APP_NAME..."

az functionapp config appsettings set \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --settings \
    SENDGRID_API_KEY="$SENDGRID_API_KEY" \
    JWT_SECRET="$JWT_SECRET" \
    STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
    STRIPE_PRICE_ID="$STRIPE_PRICE_ID" \
    STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"

echo "Done! Environment variables updated."
