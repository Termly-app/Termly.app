-- ============================================================
-- PORTAL RPC STABILIZATION V2
-- Standardizing on JSON return types and robust cleanup
-- ============================================================

-- 1. AGGRESSIVE CLEANUP (Drop by name to handle all signatures)
DROP FUNCTION IF EXISTS public.portal_get_student_results_v2;
DROP FUNCTION IF EXISTS public.portal_get_announcements_v2;
DROP FUNCTION IF EXISTS public.portal_get_assignments_v2;
DROP FUNCTION IF EXISTS public.portal_get_student_fees_v2;
DROP FUNCTION IF EXISTS public.portal_get_student_payments_v2;
DROP FUNCTION IF EXISTS public.portal_get_student_profile;
DROP FUNCTION IF EXISTS public.portal_get_subject_details;

-- 2. Student Results
CREATE OR REPLACE FUNCTION public.portal_get_student_results_v2(p_student_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _res JSON;
BEGIN
  SELECT json_agg(t) INTO _res FROM (
    SELECT 
      er.id, er.total_marks, er.mean_score, er.class_position, er.class_size, 
      e.name as exam_name, e.term as exam_term, e.exam_type as exam_type,
      e.created_at as exam_date
    FROM public.exam_results er 
    JOIN public.exams e ON e.id = er.exam_id
    WHERE er.student_id = p_student_id 
      AND e.status ILIKE 'published' 
    ORDER BY e.created_at DESC
  ) t;
  RETURN COALESCE(_res, '[]'::JSON);
END; $$;

-- 3. Announcements
CREATE OR REPLACE FUNCTION public.portal_get_announcements_v2(p_school_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _res JSON;
BEGIN
  SELECT json_agg(t) INTO _res FROM (
    SELECT a.id, a.title, a.body, a.created_at, u.name as author_name
    FROM public.announcements a 
    LEFT JOIN public.users u ON u.id = a.created_by
    WHERE a.school_id = p_school_id 
      AND a.status ILIKE 'published' 
    ORDER BY a.created_at DESC
  ) t;
  RETURN COALESCE(_res, '[]'::JSON);
END; $$;

-- 4. Assignments
CREATE OR REPLACE FUNCTION public.portal_get_assignments_v2(p_school_id UUID, p_class_id UUID DEFAULT NULL)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _res JSON;
BEGIN
  SELECT json_agg(t) INTO _res FROM (
    SELECT id, title, description, due_date, subject_id, class_id, created_at
    FROM public.el_assignments 
    WHERE school_id = p_school_id 
      AND (p_class_id IS NULL OR class_id = p_class_id) 
    ORDER BY created_at DESC
  ) t;
  RETURN COALESCE(_res, '[]'::JSON);
END; $$;

-- 5. Student Fees
CREATE OR REPLACE FUNCTION public.portal_get_student_fees_v2(p_student_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _res JSON;
BEGIN
  SELECT row_to_json(t) INTO _res FROM (
    SELECT f.id, f.total_fee, f.paid, f.balance
    FROM public.fees f
    WHERE f.student_id = p_student_id
    ORDER BY f.created_at DESC LIMIT 1
  ) t;
  RETURN COALESCE(_res, '{}'::JSON);
END; $$;

-- 6. Student Payments
CREATE OR REPLACE FUNCTION public.portal_get_student_payments_v2(p_student_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _res JSON;
BEGIN
  SELECT json_agg(t) INTO _res FROM (
    SELECT 
      p.id, p.amount, p.date, p.method, p.reference, 
      COALESCE(p.status, 'Success') as status
    FROM public.fee_payments p
    JOIN public.fees f ON f.id = p.fee_id
    WHERE f.student_id = p_student_id 
      AND (p.status IS NULL OR p.status NOT ILIKE 'voided')
    ORDER BY p.date DESC
  ) t;
  RETURN COALESCE(_res, '[]'::JSON);
END; $$;

-- 7. Student Profile (Basic Info)
CREATE OR REPLACE FUNCTION public.portal_get_student_profile(p_student_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _res JSON;
BEGIN
  SELECT row_to_json(t) INTO _res FROM (
    SELECT s.id, s.name, s.adm_no, s.class_grade, s.stream, s.gender, s.parent_name, s.parent_phone
    FROM public.students s
    WHERE s.id = p_student_id
  ) t;
  RETURN _res;
END; $$;

-- 8. Subject Details (Enrolled Subjects)
CREATE OR REPLACE FUNCTION public.portal_get_subject_details(p_student_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _res JSON;
BEGIN
  -- Logic to fetch subjects for the student's class/grade
  SELECT json_agg(t) INTO _res FROM (
    SELECT sub.id, sub.name, sub.code
    FROM public.tt_subjects sub
    JOIN public.students s ON s.id = p_student_id
    WHERE sub.school_id = s.school_id
  ) t;
  RETURN COALESCE(_res, '[]'::JSON);
END; $$;

-- GRANT ACCESS
GRANT EXECUTE ON FUNCTION public.portal_get_student_results_v2 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_announcements_v2 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_assignments_v2 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_student_fees_v2 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_student_payments_v2 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_student_profile TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_subject_details TO anon, authenticated;

-- RELOAD
NOTIFY pgrst, 'reload schema';
