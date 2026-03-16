-- ============================================================
-- Super Admin Global Access Boost (Self-Healing Version)
-- Run this script in your Supabase SQL Editor to fix visibility
-- ============================================================

-- 0. INITIALIZE PLATFORM TABLES (If missing)
CREATE TABLE IF NOT EXISTS public.platform_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    type TEXT NOT NULL, 
    description TEXT,
    actor_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Helper function to identify platform admins
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() ->> 'email') IN ('admin@shulesoft.com', 'shulesoft8@gmail.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant Global Access on Core Tables
DO $$ 
BEGIN
    -- SCHOOLS
    DROP POLICY IF EXISTS "Super Admin Global Select" ON public.schools;
    CREATE POLICY "Super Admin Global Select" ON public.schools FOR SELECT USING (public.is_platform_admin());
    
    DROP POLICY IF EXISTS "Super Admin Global Manage" ON public.schools;
    CREATE POLICY "Super Admin Global Manage" ON public.schools FOR ALL USING (public.is_platform_admin());

    -- SCHOOL PROFILES
    DROP POLICY IF EXISTS "Super Admin Profile Select" ON public.school_profiles;
    CREATE POLICY "Super Admin Profile Select" ON public.school_profiles FOR SELECT USING (public.is_platform_admin());
    
    DROP POLICY IF EXISTS "Super Admin Profile Manage" ON public.school_profiles;
    CREATE POLICY "Super Admin Profile Manage" ON public.school_profiles FOR ALL USING (public.is_platform_admin());

    -- USERS
    DROP POLICY IF EXISTS "Super Admin User Select" ON public.users;
    CREATE POLICY "Super Admin User Select" ON public.users FOR SELECT USING (public.is_platform_admin());
    
    DROP POLICY IF EXISTS "Super Admin User Manage" ON public.users;
    CREATE POLICY "Super Admin User Manage" ON public.users FOR ALL USING (public.is_platform_admin());

    -- PAYMENTS
    DROP POLICY IF EXISTS "Super Admin Payment Select" ON public.payments;
    CREATE POLICY "Super Admin Payment Select" ON public.payments FOR SELECT USING (public.is_platform_admin());
    
    DROP POLICY IF EXISTS "Super Admin Payment Manage" ON public.payments;
    CREATE POLICY "Super Admin Payment Manage" ON public.payments FOR ALL USING (public.is_platform_admin());

    -- PLATFORM ACTIVITY (Safety check)
    DROP POLICY IF EXISTS "Super Admins can view all activity" ON public.platform_activity;
    CREATE POLICY "Super Admins can view all activity" ON public.platform_activity FOR SELECT USING (public.is_platform_admin());

    -- PLATFORM SETTINGS (Safety check)
    DROP POLICY IF EXISTS "Super Admins can modify platform settings" ON public.platform_settings;
    CREATE POLICY "Super Admins can modify platform settings" ON public.platform_settings FOR ALL USING (public.is_platform_admin());
END $$;

-- 3. Ensure RLS is enabled
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- 4. Log the update
INSERT INTO public.platform_activity (type, description)
VALUES ('SYSTEM_UPDATE', 'Applied Super Admin Global RLS Boost (with self-healing schema)');
