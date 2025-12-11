#!/bin/bash

# duplicate files/dirs to remove from root
ITEMS=(
    "manifest.json"
    "background.js"
    "sidepanel.js"
    "api.js"
    "auth.js"
    "content"
    "defaults"
    "icons"
    "offscreen"
    "options"
    "sidepanel"
    "utils"
)

echo "Cleaning up root directory duplicates..."

for item in "${ITEMS[@]}"; do
    if [ -e "$item" ]; then
        echo "Removing $item..."
        rm -rf "$item"
    else
        echo "$item not found in root, skipping."
    fi
done

echo "Cleanup complete. Please use the 'extensions' directory for development and deployment."
