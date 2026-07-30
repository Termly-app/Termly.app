-- ============================================================
-- 20260723_consolidate_platform_admin_identity.sql
--
-- Consolidates is_platform_admin() to a single, table-driven
-- definition.  The only platform admin email is shulesoft8@gmail.com.
--
-- This migration:
--   1. Cleans platform_admins to contain only shulesoft8@gmail.com
--   2. Redefines is_platform_admin() to read from that table
--   3. Replaces two inline-hardcoded RLS policies with calls to
--      the shared function
--
-- After this migration, add/remove admins via the table — never
-- redefine is_platform_admin() again.
-- ============================================================

-- 1. Clean up the platform_admins table: remove every stale email,
--    ensure only shulesoft8@gmail.com exists.
DELETE FROM public.platform_admins WHERE email != 'shulesoft8@gmail.com';

INSERT INTO public.platform_admins (email, added_by)
VALUES ('shulesoft8@gmail.com', 'system')
ON CONFLICT (email) DO NOTHING;

-- Mark the platform account flag on schools for the sole admin.
UPDATE public.schools SET is_platform_account = true
WHERE email = 'shulesoft8@gmail.com';

-- Un-flag any old Termly/Termly accounts that are not the real admin.
UPDATE public.schools SET is_platform_account = false
WHERE email IN ('admin@Termly.com', 'admin@Termly.com')
  AND email != 'shulesoft8@gmail.com';

-- 2. The one, final definition of is_platform_admin().
--    Reads from the table — no hardcoded emails.
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE email = (auth.jwt() ->> 'email')
  );
$$;

-- 3. Replace the two policies that hardcoded emails inline.
DROP POLICY IF EXISTS "Super Admins can view all activity" ON public.platform_activity;
CREATE POLICY "Super Admins can view all activity" ON public.platform_activity
    FOR SELECT USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Super Admins can modify platform settings" ON public.platform_settings;
CREATE POLICY "Super Admins can modify platform settings" ON public.platform_settings
    FOR ALL USING (public.is_platform_admin());

-- Verify after running:
--   SELECT email FROM public.platform_admins;
--   → shulesoft8@gmail.com  (only row)
--
--   SELECT public.is_platform_admin();
--   → true  (when authenticated as shulesoft8@gmail.com)
