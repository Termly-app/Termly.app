-- ============================================================
-- Super Admin Global Visibility & Pricing Recovery
-- Execute this script in the Supabase SQL Editor
-- ============================================================

-- 1. Ensure the platform admin check is robust
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.jwt() ->> 'email' = 'admin@shulesoft.com' OR 
    auth.jwt() ->> 'email' = 'shulesoft8@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Repair Schools RLS
DROP POLICY IF EXISTS "Super Admins can view all schools" ON schools;
CREATE POLICY "Super Admins can view all schools" ON schools
    FOR SELECT USING (public.is_platform_admin());

-- 3. Repair School Profiles RLS
DROP POLICY IF EXISTS "Super Admins can view all profiles" ON school_profiles;
CREATE POLICY "Super Admins can view all profiles" ON school_profiles
    FOR SELECT USING (public.is_platform_admin());

-- 4. Ensure Public can read Platform Settings (Required for Landing Page)
DROP POLICY IF EXISTS "Public can view platform settings" ON platform_settings;
CREATE POLICY "Public can view platform settings" ON platform_settings
    FOR SELECT USING (true);

-- 5. Seed Core Pricing if missing (Fala & Champe)
-- This ensures the landing page has real data to pull
INSERT INTO platform_settings (key, value, description)
VALUES ('pricing', '{
  "Fala": { "price": 5999, "active": true, "limit": 125, "features": ["profiles", "fees", "attendance", "reports"] },
  "Champe": { "price": 50000, "active": true, "limit": 5000, "features": ["everything_starter", "cbc", "exams", "priority"] }
}', 'Global pricing plans')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 6. Grant Super Admin explicit access to activity logs
DROP POLICY IF EXISTS "Super Admins can view all activity" ON platform_activity;
CREATE POLICY "Super Admins can view all activity" ON platform_activity
    FOR SELECT USING (public.is_platform_admin());

-- 7. Ensure payments are visible to admins
DROP POLICY IF EXISTS "Super Admins can view all payments" ON payments;
CREATE POLICY "Super Admins can view all payments" ON payments
    FOR SELECT USING (public.is_platform_admin());
