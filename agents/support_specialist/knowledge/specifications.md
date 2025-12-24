# Karte AI+ Product Specifications for Support

## 1. Product Overview
- **Product Name**: Karte AI+ (カルテAIプラス)
- **Concept**: A Chrome Extension that acts as a "AI Assistant for Medical Records". It helps doctors process text on any web-based Electronic Medical Record (EMR) system.
- **Core Value**: Reduces documentation time, supports clinical decision making, and handles secure data processing.

## 2. Key Features
- **Smart Formatting (SOAP)**: Automatically restructures disorganized notes into standard SOAP format suitable for medical records.
- **Referral Letter Generation**: drafts referral letters based on patient notes and destination context.
- **Medical Translation**: High-accuracy translation between Japanese and English, preserving medical nuances.
- **AI Chat Support**: A built-in chat interface to ask medical questions, summarize guidelines, or check drug interactions.
- **Click-to-Insert**: Generated text can be inserted into the active EMR text field with a single click.

## 3. Technical Specifications
- **Platform**: Google Chrome Extension (PC only). Not supported on mobile devices.
- **Requirement**: Google Chrome browser (latest version recommended).
- **Backend Infrastructure**: Microsoft Azure (Azure Functions, Azure OpenAI Service).
- **AI Model**: GPT-4 / GPT-3.5 Turbo (hosted on Azure OpenAI Service for compliance).

## 4. Security & Privacy
- **Data Handling**:
  - We do **NOT** use user data (patient data) for AI model training.
  - Azure OpenAI Service is used with "Zero Data Retention" policy where possible (or standard BAA compliant settings).
  - Patient data is processed in memory and transiently; extensive logs of sensitive data are de-identified or minimized.
- **Compliance**: Designed with Japanese medical guidelines (3省2ガイドライン) in mind, utilizing Azure's compliant infrastructure.

## 5. Pricing & Plans
- **Free Trial**: 14 days free access to all features upon registration.
- **Standard Plan**: Monthly subscription (exact price refer to LP/Stripe).
- **Payment Method**: Credit Card (via Stripe).
- **Cancellation**: Users can cancel anytime via the extension's account menu. Access continues until the end of the current billing cycle.

## 6. Onboarding Flow
1. **Registration**: Sign up on the Landing Page.
2. **Email Verification**: Receive a "Welcome Email" containing a 365-day Session Token.
3. **Installation**: Install the extension from Chrome Web Store.
4. **Authentication**: Open extension side panel -> Input the Session Token.
5. **Ready**: Start using.

## 7. Troubleshooting Common Issues
- **"Token Invalid"**: Check if the token was copied correctly. If expired (after 1 year), re-login on the website to regenerate.
- **Mobile Access**: The service is PC-only. Mobile users can register but must use a PC to install the extension.
- **Email Not Received**: Check Spam/Promotions folder. Sender is `DoNotReply@...azurecomm.net`.

## 8. Known Limitations & Roadmap
- **CLINICS EMR Compatibility**: Currently, line breaks may not be reflected correctly when copying text to the CLINICS medical record system. This is a known issue and a fix is scheduled for a future update.
