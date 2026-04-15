-- ============================================================================
-- FIX DATABASE LINTER SECURITY WARNINGS
-- Executing this script will resolve search_path and RLS security alerts
-- ============================================================================

-- ==========================================
-- 1. FIX FUNCTION SEARCH PATH MUTABILITY
-- ==========================================
-- Supabase requires functions to have an explicit search_path for security.
-- This block dynamically loops through the flagged functions and locks their search_path.

DO $$ 
DECLARE
  f record;
BEGIN
  FOR f IN 
    SELECT pg_proc.oid::regprocedure::text AS func_sig
    FROM pg_proc
    JOIN pg_namespace n ON pg_proc.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND proname IN (
        'is_platform_admin',
        'is_school_finance',
        'bulk_generate_copies',
        'is_school_librarian',
        'is_school_teacher',
        'issue_book',
        'record_payment',
        'return_book',
        'get_user_role',
        'sanitize_string',
        'trigger_sanitize_students',
        'trigger_sanitize_teachers',
        'trigger_sanitize_books',
        'trigger_sanitize_communications',
        'invite_sub_admin'
      )
  LOOP
    EXECUTE 'ALTER FUNCTION ' || f.func_sig || ' SET search_path = public, auth, extensions;';
  END LOOP;
END $$;


-- ==========================================
-- 2. FIX MISSING RLS AND POLICIES
-- ==========================================

-- A. Standard Tables with school_id 
-- Fix tables that have RLS Enabled but no policies attached
DROP POLICY IF EXISTS "academic_trends_select" ON public.academic_trends;
DROP POLICY IF EXISTS "academic_trends_modify" ON public.academic_trends;
CREATE POLICY "academic_trends_select" ON public.academic_trends FOR SELECT USING (school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "academic_trends_modify" ON public.academic_trends FOR ALL USING (school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "assignments_select" ON public.assignments;
DROP POLICY IF EXISTS "assignments_modify" ON public.assignments;
CREATE POLICY "assignments_select" ON public.assignments FOR SELECT USING (school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "assignments_modify" ON public.assignments FOR ALL USING (school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "communications_log_select" ON public.communications_log;
DROP POLICY IF EXISTS "communications_log_modify" ON public.communications_log;
CREATE POLICY "communications_log_select" ON public.communications_log FOR SELECT USING (school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "communications_log_modify" ON public.communications_log FOR ALL USING (school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "incidental_charges_select" ON public.incidental_charges;
DROP POLICY IF EXISTS "incidental_charges_modify" ON public.incidental_charges;
CREATE POLICY "incidental_charges_select" ON public.incidental_charges FOR SELECT USING (school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "incidental_charges_modify" ON public.incidental_charges FOR ALL USING (school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "invoice_logs_select" ON public.invoice_logs;
DROP POLICY IF EXISTS "invoice_logs_modify" ON public.invoice_logs;
CREATE POLICY "invoice_logs_select" ON public.invoice_logs FOR SELECT USING (school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "invoice_logs_modify" ON public.invoice_logs FOR ALL USING (school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "lms_assignments_select" ON public.lms_assignments;
DROP POLICY IF EXISTS "lms_assignments_modify" ON public.lms_assignments;
CREATE POLICY "lms_assignments_select" ON public.lms_assignments FOR SELECT USING (school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "lms_assignments_modify" ON public.lms_assignments FOR ALL USING (school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "notifications_log_select" ON public.notifications_log;
DROP POLICY IF EXISTS "notifications_log_modify" ON public.notifications_log;
CREATE POLICY "notifications_log_select" ON public.notifications_log FOR SELECT USING (school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "notifications_log_modify" ON public.notifications_log FOR ALL USING (school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()));

-- B. Enable RLS and add basic policies for timetable_rooms
ALTER TABLE IF EXISTS public.timetable_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "timetable_rooms_select" ON public.timetable_rooms;
DROP POLICY IF EXISTS "timetable_rooms_modify" ON public.timetable_rooms;
CREATE POLICY "timetable_rooms_select" ON public.timetable_rooms FOR SELECT USING (
  school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()) OR 
  school_id IN (SELECT id FROM public.schools WHERE owner_id = auth.uid())
);
CREATE POLICY "timetable_rooms_modify" ON public.timetable_rooms FOR ALL USING (
  school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid() AND role IN ('Admin', 'admin')) OR 
  school_id IN (SELECT id FROM public.schools WHERE owner_id = auth.uid())
);

-- C. Nested Tables missing direct school_id
-- submissions links to assignments
DROP POLICY IF EXISTS "submissions_select" ON public.submissions;
DROP POLICY IF EXISTS "submissions_modify" ON public.submissions;
CREATE POLICY "submissions_select" ON public.submissions FOR SELECT USING (
    assignment_id IN (SELECT id FROM public.assignments WHERE school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()))
);
CREATE POLICY "submissions_modify" ON public.submissions FOR ALL USING (
    assignment_id IN (SELECT id FROM public.assignments WHERE school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()))
);

-- lms_submissions links to lms_assignments
DROP POLICY IF EXISTS "lms_submissions_select" ON public.lms_submissions;
DROP POLICY IF EXISTS "lms_submissions_modify" ON public.lms_submissions;
CREATE POLICY "lms_submissions_select" ON public.lms_submissions FOR SELECT USING (
    assignment_id IN (SELECT id FROM public.lms_assignments WHERE school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()))
);
CREATE POLICY "lms_submissions_modify" ON public.lms_submissions FOR ALL USING (
    assignment_id IN (SELECT id FROM public.lms_assignments WHERE school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()))
);
