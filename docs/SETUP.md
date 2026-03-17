# ShuleSoft Setup & Deployment Guide

This document provides step-by-step instructions for setting up ShuleSoft for local development and production deployment.

## 1. Prerequisites

- **Node.js**: Version 18 or higher.
- **NPM**: Version 9 or higher.
- **Supabase Account**: A free or pro project at [supabase.com](https://supabase.com).

## 2. Local Environment Setup

1. **Clone the project**:
   ```bash
   git clone <your-repository-url>
   cd shulesoft.app
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (or use `.env.local` for Vite):
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   *You can find these in your Supabase Dashboard under Settings > API.*

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

## 3. Database & Supabase Configuration

To get the backend fully functional, you need to execute the SQL scripts located in the `supabase/` directory in the following order:

1.  **Initial Schema**: (If starting fresh, ensure your tables match the `store.js` definitions).
2.  **RLS Policies**: Run `supabase/fix_rls.sql` to establish secure access control.
3.  **Platform Access**: Run `supabase/fix_platform_access.sql` to enable SuperAdmin visibility.
4.  **Admin Utilities**: Run `supabase/platform_reset_password.sql` to enable the administrative password reset RPC.
5.  **Data Seed**: Run `supabase/super_admin_ops_rectified_v2.sql` to seed pricing tiers and critical settings.

## 4. Production Deployment

### Frontend (Static Hosting)
ShuleSoft is a Vite-based SPA. You can deploy the `dist/` folder to any static host:

- **Vercel/Netlify**: Just connect your repository; the build command is `npm run build` and output directory is `dist`.
- **Environment Variables**: Make sure to add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your hosting provider's dashboard.

### PWA Configuration
The application is pre-configured as a Progressive Web App (PWA).
- Ensure `manifest.json` is served correctly from the root.
- Ensure all app icons are present in `public/assets/`.

## 5. Troubleshooting

- **Auth Issues**: Ensure "Email Confirmations" are either enabled or disabled in Supabase Auth settings as per your preference.
- **RLS Errors**: If you get "recursion" errors, re-run `supabase/fix_rls.sql`.
- **Plan Limits**: If a school cannot add students, check the `subscription_plan` in the `schools` table and verify it corresponds to a key in `SEAT_LIMITS` in `store.js`.
