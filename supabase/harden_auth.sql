-- ============================================================
-- Authorization Hardening (Move Admins to Table)
-- ============================================================

-- 1. Create Platform Admins Table
CREATE TABLE IF NOT EXISTS platform_admins (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    added_by TEXT -- Email of the person who added them
);

-- 2. Seed Initial Admins
INSERT INTO platform_admins (email, added_by)
VALUES ('admin@shulesoft.com', 'system'), ('shulesoft8@gmail.com', 'system')
ON CONFLICT (email) DO NOTHING;

-- 3. Update the global is_platform_admin helper
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM platform_admins 
        WHERE email = auth.jwt() ->> 'email'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update Policies to use the function (referencing existing tables)

-- Platform Activity
DROP POLICY IF EXISTS "Super Admins can view all activity" ON platform_activity;
CREATE POLICY "Super Admins can view all activity" ON platform_activity
    FOR SELECT USING (public.is_platform_admin());

-- Platform Settings
DROP POLICY IF EXISTS "Super Admins can modify platform settings" ON platform_settings;
CREATE POLICY "Super Admins can modify platform settings" ON platform_settings
    FOR ALL USING (public.is_platform_admin());

-- Schools
DROP POLICY IF EXISTS "Super Admins can view all schools" ON schools;
CREATE POLICY "Super Admins can view all schools" ON schools
    FOR SELECT USING (public.is_platform_admin());

-- School Profiles
DROP POLICY IF EXISTS "Super Admins can view all profiles" ON school_profiles;
CREATE POLICY "Super Admins can view all profiles" ON school_profiles
    FOR SELECT USING (public.is_platform_admin());

-- Payments
DROP POLICY IF EXISTS "Super Admins can view all payments" ON payments;
CREATE POLICY "Super Admins can view all payments" ON payments
    FOR SELECT USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Super Admins can manage all payments" ON payments;
CREATE POLICY "Super Admins can manage all payments" ON payments
    FOR UPDATE USING (public.is_platform_admin());
