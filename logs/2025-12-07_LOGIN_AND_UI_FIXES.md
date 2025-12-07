# 2025-12-07 Login Logic Fix & Subscription UI Addition

## Summary of Changes
Resolved critical issues preventing existing users from logging in and managing subscriptions.

### 1. Backend Fixes (`azure-functions/`)
- **Login Loop Fix**: Modified `auth-verify-token` to allow already active users (status: active/trialing) to receive a session token instead of blocking them with a "Duplicate Registration" (409) error.
- **ReferenceError Fix**: Corrected a variable scope issue (`isActive` ReferenceError) that caused 500/401 crashes in `auth-verify-token`.
- **Dependency Downgrade**: Downgraded `@azure/data-tables` to v12 to resolve Node.js 20 compatibility issues causing 500 errors.

### 2. Frontend Fixes - Extension (`options/`)
- **Subscription UI**: Added a "Subscription Management" section to the bottom of the Options page (`options.html`).
- **Cancellation Button**: Implemented "Manage / Cancel Subscription" button that redirects to the Stripe Billing Portal.
- **Duplicate Extension Issue**: Updated both the root `options/` and duplicate `extensions/options/` directories to ensure the fix is applied regardless of which folder the user loads.

### 3. Frontend Fixes - Landing Page (`landing-page/`)
- **Success Page UX**: Updated the post-payment Success Page to instruct users to copy the token immediately, removing the confusing instruction to "wait for email".

## Status
- **Deployed**: All Azure Functions and the Landing Page have been deployed.
- **Verified**: Login flow and subscription portal access validated.
