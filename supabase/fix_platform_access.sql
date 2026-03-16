-- ============================================================
-- Platform Access Fix (Super Admin Global Visibility)
-- Execute this script in the Supabase SQL Editor
-- ============================================================

-- 1. Identify Platform Admins globally
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT auth.jwt() ->> 'email' IN ('admin@shulesoft.com', 'shulesoft8@gmail.com');
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Update Schools RLS
DROP POLICY IF EXISTS "Super Admins can view all schools" ON schools;
CREATE POLICY "Super Admins can view all schools" ON schools
    FOR SELECT USING (public.is_platform_admin());

-- 3. Update School Profiles RLS (Crucial for KPIs)
DROP POLICY IF EXISTS "Super Admins can view all profiles" ON school_profiles;
CREATE POLICY "Super Admins can view all profiles" ON school_profiles
    FOR SELECT USING (public.is_platform_admin());

-- 4. Update Payments RLS (Fixes Revenue/Payments tab)
DROP POLICY IF EXISTS "Super Admins can view all payments" ON payments;
CREATE POLICY "Super Admins can view all payments" ON payments
    FOR SELECT USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Super Admins can manage all payments" ON payments;
CREATE POLICY "Super Admins can manage all payments" ON payments
    FOR UPDATE USING (public.is_platform_admin());

-- 5. Enable Real-Time for core tables (required for the "immediate" reflection)
ALTER PERCENT_REPLACE_WITH_SCHEMA_NAME.publications.supabase_realtime ADD TABLE schools;
ALTER PERCENT_REPLACE_WITH_SCHEMA_NAME.publications.supabase_realtime ADD TABLE school_profiles;
ALTER PERCENT_REPLACE_WITH_SCHEMA_NAME.publications.supabase_realtime ADD TABLE payments;
ALTER PERCENT_REPLACE_WITH_SCHEMA_NAME.publications.supabase_realtime ADD TABLE platform_activity;
