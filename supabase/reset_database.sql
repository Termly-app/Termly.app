-- ============================================================
-- Database Reset Script (TRUNCATE ALL DATA)
-- Execute this script in the Supabase SQL Editor
-- ============================================================

-- 1. Disable triggers temporarily (to avoid RLS issues during delete)
-- Run this as service_role/admin if possible.

-- 1. Delete all schools (cascades to profiles, users, students, fees, etc.)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schools') THEN
        DELETE FROM public.schools;
    END IF;
END $$;

-- 2. Clear activity logs
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_activity') THEN
        DELETE FROM public.platform_activity;
    END IF;
END $$;

-- 3. Delete all Auth users
DELETE FROM auth.users;

-- 4. Optional: Reset platform settings to defaults
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_settings') THEN
        DELETE FROM public.platform_settings;
        INSERT INTO public.platform_settings (key, value, description) VALUES
        ('billing', '{"term_price": 3000, "mpesa_number": "07XXXXXXXX", "trial_days": 30}', 'Global billing and trial configuration'),
        ('support', '{"email": "support@shulesoft.com", "phone": "+254 700 000000"}', 'Platform support contact details')
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    END IF;
END $$;
