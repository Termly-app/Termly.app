-- ============================================================
-- DOMAIN 1: RLS & MULTI-TENANT DATA ISOLATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Portal School Search Exclusions
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS is_platform_account BOOLEAN DEFAULT false;
-- Set existing platform admin schools to true
UPDATE public.schools SET is_platform_account = true WHERE email IN ('admin@shulesoft.com', 'shulesoft8@gmail.com');

-- 2. Custom Claims Hook
-- Adds school_id and role to the JWT so policies don't need a JOIN
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
  DECLARE
    claims jsonb;
    user_role public.users.role%TYPE;
    user_school_id public.users.school_id%TYPE;
  BEGIN
    -- Only run if we have an authenticated user
    IF event->>'user_id' IS NULL THEN
      RETURN event;
    END IF;

    -- Fetch role and school_id from users table
    SELECT role, school_id INTO user_role, user_school_id
    FROM public.users
    WHERE auth_user_id = (event->>'user_id')::uuid
    LIMIT 1;

    claims := event->'claims';

    IF user_role IS NOT NULL THEN
      claims := jsonb_set(claims, '{school_id}', to_jsonb(user_school_id));
      claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
    END IF;

    -- Update the 'claims' object in the original event
    event := jsonb_set(event, '{claims}', claims);

    RETURN event;
  END;
$$;

-- Note: To enable this hook, you must assign it in Supabase Dashboard:
-- Authentication -> Hooks -> Access Token (Send) -> custom_access_token_hook

-- 3. Strict RLS Policies
-- First, disable all existing policies to ensure a clean slate
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbc_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_activity ENABLE ROW LEVEL SECURITY;
-- (Assuming other tables exist or will be created in later steps like audit_logs, portal_users)

-- Helper function to check if user is platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.platform_admins 
        WHERE email = auth.jwt() ->> 'email'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- A. Platform Settings (Read-Only for all)
-- ==========================================
DROP POLICY IF EXISTS "Public can view platform settings" ON public.platform_settings;
CREATE POLICY "Public can view platform settings" ON public.platform_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Super Admins can modify platform settings" ON public.platform_settings;
CREATE POLICY "Super Admins can modify platform settings" ON public.platform_settings FOR ALL USING (public.is_platform_admin());

-- ==========================================
-- B. Schools (Portal Search Filter + Admin)
-- ==========================================
DROP POLICY IF EXISTS "schools_owner_all" ON public.schools;
DROP POLICY IF EXISTS "schools_member_select" ON public.schools;
DROP POLICY IF EXISTS "schools_insert" ON public.schools;
DROP POLICY IF EXISTS "Super Admin Global Select" ON public.schools;
DROP POLICY IF EXISTS "Super Admins can view all schools" ON public.schools;

-- Anyone can select active schools for the portal login dropdown (enforcing the exclusion)
CREATE POLICY "Public can select active non-platform schools" ON public.schools
  FOR SELECT USING (is_platform_account = false AND status = 'active' AND plan != 'Sandbox');

CREATE POLICY "Platform Admins manage all schools" ON public.schools
  FOR ALL USING (public.is_platform_admin());

CREATE POLICY "School members see own school" ON public.schools
  FOR SELECT USING (id = (auth.jwt() ->> 'school_id')::uuid);

-- ==========================================
-- C. Multi-Tenant Isolation for standard tables
-- ==========================================
-- Helper to apply standard school isolation
-- We will use raw auth.jwt() to avoid slow queries.

-- students
DROP POLICY IF EXISTS "students_select" ON public.students;
DROP POLICY IF EXISTS "students_modify" ON public.students;
CREATE POLICY "School users access own students" ON public.students
  FOR ALL USING (
    school_id = (auth.jwt() ->> 'school_id')::uuid 
    OR public.is_platform_admin()
  );

-- profiles
DROP POLICY IF EXISTS "school_profiles_select" ON public.school_profiles;
DROP POLICY IF EXISTS "school_profiles_update" ON public.school_profiles;
DROP POLICY IF EXISTS "Super Admins can view all profiles" ON public.school_profiles;
CREATE POLICY "School users access own profile" ON public.school_profiles
  FOR ALL USING (
    school_id = (auth.jwt() ->> 'school_id')::uuid 
    OR public.is_platform_admin()
  );

-- marks
DROP POLICY IF EXISTS "marks_select" ON public.marks;
DROP POLICY IF EXISTS "marks_modify" ON public.marks;
CREATE POLICY "School users access own marks" ON public.marks
  FOR ALL USING (
    school_id = (auth.jwt() ->> 'school_id')::uuid 
    OR public.is_platform_admin()
  );

-- fees
DROP POLICY IF EXISTS "fees_select" ON public.fees;
DROP POLICY IF EXISTS "fees_modify" ON public.fees;
CREATE POLICY "School users access own fees" ON public.fees
  FOR ALL USING (
    school_id = (auth.jwt() ->> 'school_id')::uuid 
    OR public.is_platform_admin()
  );

-- fee_payments
-- Since fee_payments doesn't have school_id directly, we check through fees table
DROP POLICY IF EXISTS "fee_payments_select" ON public.fee_payments;
DROP POLICY IF EXISTS "fee_payments_modify" ON public.fee_payments;
CREATE POLICY "School users access own payments" ON public.fee_payments
  FOR ALL USING (
    fee_id IN (SELECT id FROM public.fees WHERE school_id = (auth.jwt() ->> 'school_id')::uuid)
    OR public.is_platform_admin()
  );

-- attendance
DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
DROP POLICY IF EXISTS "attendance_modify" ON public.attendance;
CREATE POLICY "School users access own attendance" ON public.attendance
  FOR ALL USING (
    school_id = (auth.jwt() ->> 'school_id')::uuid 
    OR public.is_platform_admin()
  );

-- subject_assignments
DROP POLICY IF EXISTS "subject_assignments_select" ON public.subject_assignments;
DROP POLICY IF EXISTS "subject_assignments_modify" ON public.subject_assignments;
CREATE POLICY "School users access own assignments" ON public.subject_assignments
  FOR ALL USING (
    school_id = (auth.jwt() ->> 'school_id')::uuid 
    OR public.is_platform_admin()
  );
