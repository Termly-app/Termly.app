-- ============================================================
-- Fix Super Admin RLS and Schema Mismatches
-- ============================================================

-- 1. Ensure is_platform_admin() is robust and used everywhere
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check 1: platform_admins table
    IF EXISTS (SELECT 1 FROM public.platform_admins WHERE email = auth.jwt() ->> 'email') THEN
        RETURN TRUE;
    END IF;

    -- Check 2: schools table is_platform_account flag
    IF EXISTS (
        SELECT 1 FROM public.schools 
        WHERE id = (auth.jwt() ->> 'school_id')::uuid 
        AND is_platform_account = true
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix school_features RLS
-- The current policy uses hardcoded 'platform_admin' role which might not be in JWT
DROP POLICY IF EXISTS "Super admins control school_features" ON public.school_features;
CREATE POLICY "Super admins control school_features" ON public.school_features
    FOR ALL 
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- 3. Fix platform_activity RLS
DROP POLICY IF EXISTS "Super Admins can view all activity" ON public.platform_activity;
CREATE POLICY "Super Admins can view all activity" ON public.platform_activity
    FOR ALL
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- 4. Ensure school_profiles has updated_at and created_at if missing (or use updated_at for ordering)
-- We already updated the code to use updated_at, but adding created_at is good for consistency
ALTER TABLE public.school_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Fix potential ambiguity in platform_activity join
-- Ensure foreign key is explicit
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_activity_school_id_fkey') THEN
        ALTER TABLE public.platform_activity 
        ADD CONSTRAINT platform_activity_school_id_fkey 
        FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Reload Schema
NOTIFY pgrst, 'reload schema';
