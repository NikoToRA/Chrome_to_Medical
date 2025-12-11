#!/bin/bash

# User to delete
ROW_KEY="c3VwZXIyMDZjY0BnbWFpbC5jb20=" # super206cc@gmail.com base64
TABLE="Subscriptions"
ACCOUNT="stkarteai1763705952"

echo "Deleting subscription for super206cc@gmail.com..."

az storage entity delete \
  --partition-key Subscription \
  --row-key "$ROW_KEY" \
  --table-name "$TABLE" \
  --account-name "$ACCOUNT"

if [ $? -eq 0 ]; then
    echo "✅ Successfully deleted. You can now re-register."
else
    echo "❌ Deletion failed."
fi
