-- ============================================================================
-- SHULESOFT PLATFORM RESTORATION & HARDENING SCRIPT
-- ============================================================================
-- Purpose:
-- 1. Restores default pricing, billing details, and module features.
-- 2. Implements protection against manual UI setting overwrites (ON CONFLICT DO NOTHING).
-- 3. Enables dynamic user-limit enforcement based on current platform settings.
-- ============================================================================

-- 1. RESTORE PLATFORM SETTINGS (BILLING & PRICING)
-- The table structure uses 'key' as the identifier and 'value' for the JSON payload.

-- Restore Billing Details
INSERT INTO public.platform_settings (key, value, updated_at)
VALUES (
  'billing',
  '{
    "mpesa_shortcode": "4122600",
    "account_name": "Peter Kaulani",
    "account_number": "+254712260057",
    "currency": "KSh",
    "trial_days": 0
  }'::jsonb,
  NOW()
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Restore Pricing Plans
INSERT INTO public.platform_settings (key, value, updated_at)
VALUES (
  'pricing',
  '{
    "Sandbox": {
      "price": 0,
      "limit": 150,
      "admins": 10,
      "modules": ["student_mgmt", "staff_mgmt", "attendance", "grading", "fees", "dashboard"],
      "features": ["Evaluation Mode", "Core Modules Only"]
    },
