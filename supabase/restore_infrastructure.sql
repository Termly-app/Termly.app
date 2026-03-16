-- ============================================================
-- PLATFORM INFRASTRUCTURE RESTORATION
-- Run this in your Supabase SQL Editor to fix the 
-- "platform_settings table not found" error.
-- ============================================================

-- 1. Create the settings table
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- 3. Setup RLS Policies
DROP POLICY IF EXISTS "Public can view platform settings" ON public.platform_settings;
CREATE POLICY "Public can view platform settings" ON public.platform_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Super Admins can modify platform settings" ON public.platform_settings;
CREATE POLICY "Super Admins can modify platform settings" ON public.platform_settings
    FOR ALL USING (
        auth.jwt() ->> 'email' IN ('admin@shulesoft.com', 'shulesoft8@gmail.com')
    );

-- 4. Seed Global Configuration
-- Pricing Data
INSERT INTO public.platform_settings (key, value, description) VALUES
('pricing', '{"Starter": {"price": 4999, "limit": 300, "features": ["profiles", "fees", "attendance", "reports"]}, "School": {"price": 9999, "limit": 1000, "features": ["everything_starter", "cbc", "exams", "priority"]}, "Standard": {"price": 14999, "limit": 2500, "features": ["everything_school", "sms", "accounting"]}, "Premium": {"price": 24999, "limit": 9999, "features": ["multi_campus", "unlimited", "white_label"]}}', 'Global pricing plans for schools')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Billing Data
INSERT INTO public.platform_settings (key, value, description) VALUES
('billing', '{"mpesa_number": "+254712260057", "mpesa_name": "Peter Kaulani", "instructions": "Send money to +254712260057 (Peter Kaulani)", "trial_days": 30}', 'Billing and payment instructions')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Support Data
INSERT INTO public.platform_settings (key, value, description) VALUES
('support', '{"email": "shulesoft8@gmail.com", "phone": "+254712260057", "whatsapp": "+254712260057"}', 'Platform support contact details')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
