# Project Structure & Universal Rules

This document outlines the organization of the Chrome to Medical project and establishes universal rules for development to prevent confusion caused by duplicate files.

## 🌟 Universal Rules

1.  **`extensions/` is the Single Source of Truth**:
    *   All active code for the Chrome Extension resides within the `extensions/` directory.
    *   **NEVER** edit files in the root `sidepanel/`, `utils/`, `content/`, or `background.js` directly. These are legacy/duplicates.
    *   Any changes intended for the extension must be made inside `extensions/`.

2.  **Root Directory Usage**:
    *   The root directory should only be used for:
        *   Project documentation (`docs/`)
        *   Web assets (e.g., `landing-page-new/`)
        *   Configuration files that apply to the whole repo (e.g., `.gitignore`, `README.md`)
    *   **IGNORE** the following folders in the root if they exist (they verify as duplicates of `extensions/`):
        *   `/sidepanel`
        *   `/utils`
        *   `/content`
        *   `/background.js`
        *   `/manifest.json` (Use `extensions/manifest.json`)

3.  **Deployment**:
    *   When packing the extension for the Chrome Web Store, zip the contents of the `extensions/` directory.

## Directory Map

```text
/Users/suguruhirayama/Chrome_to_Medical/
├── extensions/               # ✅ MAIN EXTENSION SOURCE
│   ├── manifest.json         # ✅ Active Manifest
│   ├── background.js         # ✅ Active Background Script
│   ├── sidepanel/            # ✅ Active Sidepanel UI/Logic
│   ├── content/              # ✅ Active Content Scripts
│   ├── utils/                # ✅ Active Utilities (api.js, storage.js, etc.)
│   └── icons/                # ✅ Extension Icons
├── docs/                     # 📝 Project Documentation
├── landing-page-new/         # 🌐 Landing Page Source
│
├── sidepanel/                # ⛔️ DEPRECATED / DUPLICATE (Ignore)
├── utils/                    # ⛔️ DEPRECATED / DUPLICATE (Ignore)
├── content/                  # ⛔️ DEPRECATED / DUPLICATE (Ignore)
├── background.js             # ⛔️ DEPRECATED / DUPLICATE (Ignore)
└── manifest.json             # ⛔️ DEPRECATED / DUPLICATE (Ignore)
```

## How to fix duplications

If you find yourself editing a file in the root thinking it's the extension, **STOP**.
1.  Check if the same file exists in `extensions/`.
2.  Apply your changes to the file in `extensions/`.
3.  (Optional but recommended) Verify if the root file can be safely deleted or symlinked to avoid future confusion.
