# PRODUCT RULES LEDGER (プロダクトルール台帳)

This file serves as the **Single Source of Truth** for the "Karte AI+" product and development rules.
All developers and AI agents must adhere to these guidelines.

## 🚨 CRITICAL STRUCTURAL RULES (最重要構造ルール)

1.  **`extensions/` IS THE ONLY TRUTH**:
    *   The active Chrome Extension code lives **ONLY** in the `extensions/` directory.
    *   **IGNORE** root-level folders (`/sidepanel`, `/utils`, `/content`, `/background.js`). They are deprecated duplicates.
    *   Deployment: Zip `extensions/` for the Chrome Web Store.

2.  **Web Assets**:
    *   The Landing Page lives in `landing-page-new/`.

## 💎 Product Philosophy (プロダクト哲学)

*   **Target**: Clinic doctors and medical staff using Cloud EMRs (電子カルテ).
*   **Core Value**: Efficiency through AI (automatic medical record generation) and speed (smart snippets).
*   **Design**: Premium, modern, "Medical but Friendly". High contrast, clear typography, no "cheap" default styles.

## 🛠 Technical & UX Rules (技術・UXルール)

1.  **No Placeholders**: All features must be functional or clearly labeled as "Coming Soon" with a plan. No "Lorem Ipsum".
2.  **Direct Paste Default**: The "Direct Template Paste" feature is **ON** by default to minimize clicks.
3.  **Editable Defaults**: Default templates (Diagnoses, etc.) must be user-editable/deletable.
4.  **Frameworks**:
    *   Extension: Vanilla JS (for lightweight performance).
    *   Landing Page: React + Vite.
5.  **EMR Platform Specifics (電子カルテ個別対応)**:
    *   **Isolation Rule**: If an EMR has unique issues (e.g., newline pasting bugs), create a **dedicated platform handler** (e.g., `clinics.js`) identified by URL.
    *   **Do Not Touch Generic**: NEVER modify `generic.js` to fix a specific site's issue. Keep the generic handler pure.
    *   **HTML Insertion**: For EMRs that strip newlines, prefer `insertHTML` with `<br>` tags over "simulated typing" to maintain UX speed.

## 📂 Documentation Index

*   **Structure Details**: [docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md)
*   User Flows: `docs/2025-12-02_ALL_USER_FLOWS.md`
*   Webstore Guide: `docs/CHROME_WEBSTORE_PUBLICATION_GUIDE.md`
