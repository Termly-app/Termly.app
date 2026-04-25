# ShuleSoft — Secrets Management (Domain 3)

This document outlines the required environment variables for ShuleSoft Production. **NEVER** commit actual values to version control.

## Required Environment Variables

### 1. Supabase (Backend)
- `VITE_SUPABASE_URL`: Your Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: Your project's anonymous public key.

### 2. Africa's Talking (SMS)
- `VITE_SMS_API_KEY`: API Key from AT dashboard.
- `VITE_SMS_USERNAME`: Your AT username (e.g., `sandbox` or `shulesoft_prod`).
- `VITE_SMS_SENDER_ID`: Optional alphanumeric sender ID (must be registered with AT).

### 3. Safaricom Daraja (M-Pesa)
- `VITE_MPESA_CONSUMER_KEY`: From Daraja App.
- `VITE_MPESA_CONSUMER_SECRET`: From Daraja App.
- `VITE_MPESA_PASSKEY`: STK Push Online Passkey.
- `VITE_MPESA_SHORTCODE`: Business Paybill or Till number.
- `VITE_MPESA_CALLBACK_URL`: URL to receive payment confirmations (Supabase Edge Function).

### 4. Analytics & Error Tracking
- `VITE_SENTRY_DSN`: For ErrorBoundary tracking.
- `VITE_POSTHOG_KEY`: For usage analytics.
- `VITE_POSTHOG_HOST`: Usually `https://app.posthog.com`.

## Local Development
Create a `.env.local` file in the root directory. This file is ignored by git.

## Vercel Deployment
Add these variables in the Vercel Dashboard under **Settings > Environment Variables**.

## Supabase Edge Functions
For background tasks (SMS/M-Pesa), secrets must be set via Supabase CLI:
```bash
supabase secrets set SMS_API_KEY=your_key --project-ref your_ref
```
