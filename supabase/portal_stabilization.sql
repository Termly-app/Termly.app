-- ============================================================
-- PORTAL STABILIZATION SCRIPT (V14.1 - CLEANUP & JSONB FIX)
-- Drops existing _v2 functions to allow changing return types
-- and resolves persistent 400 Bad Request errors.
-- ============================================================

-- 0. Infrastructure
CREATE TABLE IF NOT EXISTS public.tt_teacher_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.tt_subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_id)
);

-- 1. CLEANUP: Drop existing functions to allow return type change
DROP FUNCTION IF EXISTS public.portal_get_student_results_v2(UUID);
DROP FUNCTION IF EXISTS public.portal_get_announcements_v2(UUID);
DROP FUNCTION IF EXISTS public.portal_get_assignments_v2(UUID, UUID);
DROP FUNCTION IF EXISTS public.portal_get_student_fees_v2(UUID);
DROP FUNCTION IF EXISTS public.portal_get_student_payments_v2(UUID);

-- 2. RE-CREATE: Student Results (JSONB)
CREATE OR REPLACE FUNCTION public.portal_get_student_results_v2(p_student_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  _res JSONB;
BEGIN
  SELECT jsonb_agg(row_to_json(t)) INTO _res FROM (
    SELECT er.id, er.total_marks, er.mean_score, er.class_position, er.class_size, e.name::TEXT as exam_name, e.term::TEXT as exam_term, e.exam_type::TEXT as exam_type
    FROM public.exam_results er JOIN public.exams e ON e.id = er.exam_id
    WHERE er.student_id = p_student_id AND e.status ILIKE 'published' ORDER BY e.created_at DESC
  ) t;
  RETURN COALESCE(_res, '[]'::JSONB);
END; $$;

-- 3. RE-CREATE: Announcements (JSONB)
CREATE OR REPLACE FUNCTION public.portal_get_announcements_v2(p_school_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  _res JSONB;
BEGIN
  SELECT jsonb_agg(row_to_json(t)) INTO _res FROM (
    SELECT a.id, a.title::TEXT, a.body::TEXT, a.created_at, u.name::TEXT as author_name
    FROM public.announcements a LEFT JOIN public.users u ON u.id = a.created_by
    WHERE a.school_id = p_school_id AND a.status ILIKE 'published' ORDER BY a.created_at DESC
  ) t;
  RETURN COALESCE(_res, '[]'::JSONB);
END; $$;

-- 4. RE-CREATE: Assignments (JSONB)
CREATE OR REPLACE FUNCTION public.portal_get_assignments_v2(p_school_id UUID, p_class_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  _res JSONB;
BEGIN
  SELECT jsonb_agg(row_to_json(t)) INTO _res FROM (
    SELECT * FROM public.el_assignments 
    WHERE school_id = p_school_id AND (p_class_id IS NULL OR class_id = p_class_id) 
    ORDER BY created_at DESC
  ) t;
  RETURN COALESCE(_res, '[]'::JSONB);
END; $$;

-- 5. RE-CREATE: Student Fees (JSONB)
CREATE OR REPLACE FUNCTION public.portal_get_student_fees_v2(p_student_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  _res JSONB;
BEGIN
  SELECT row_to_json(t) INTO _res FROM (
    SELECT f.id, f.total_fee, f.paid, f.balance
    FROM public.fees f
    WHERE f.student_id = p_student_id
    ORDER BY f.created_at DESC LIMIT 1
  ) t;
  RETURN _res;
END; $$;

-- 6. RE-CREATE: Student Payments (JSONB)
CREATE OR REPLACE FUNCTION public.portal_get_student_payments_v2(p_student_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  _res JSONB;
BEGIN
  SELECT jsonb_agg(row_to_json(t)) INTO _res FROM (
    SELECT 
      p.id, p.amount, p.date::TIMESTAMPTZ, p.method, p.reference, 
      COALESCE(p.status, 'Success') as status
    FROM public.fee_payments p
    JOIN public.fees f ON f.id = p.fee_id
    WHERE f.student_id = p_student_id 
      AND (p.status IS NULL OR p.status NOT ILIKE 'voided')
    ORDER BY p.date DESC
  ) t;
  RETURN COALESCE(_res, '[]'::JSONB);
END; $$;

-- 7. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
