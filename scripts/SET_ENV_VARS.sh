#!/bin/bash

# Load environment variables from .env file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE"
    echo "Please copy .env.example to .env and fill in your values."
    exit 1
fi

# Source the .env file
set -a
source "$ENV_FILE"
set +a

# Check if variables are set
if [ -z "$SENDGRID_API_KEY" ] || [ -z "$JWT_SECRET" ] || [ -z "$STRIPE_SECRET_KEY" ] || [ -z "$STRIPE_PRICE_ID" ] || [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
    echo "Error: Please edit .env file and fill in the secret variables before running."
    echo "Open '.env' in your editor."
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
