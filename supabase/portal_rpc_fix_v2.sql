-- ============================================================
-- PORTAL RPC FIX V2 — Safe Drop with explicit signatures
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Drop ALL possible signatures (JSONB and JSON variants)
DROP FUNCTION IF EXISTS public.portal_get_student_results_v2(UUID);
DROP FUNCTION IF EXISTS public.portal_get_announcements_v2(UUID);
DROP FUNCTION IF EXISTS public.portal_get_assignments_v2(UUID, UUID);
DROP FUNCTION IF EXISTS public.portal_get_assignments_v2(UUID);
DROP FUNCTION IF EXISTS public.portal_get_student_fees_v2(UUID);
DROP FUNCTION IF EXISTS public.portal_get_student_payments_v2(UUID);
DROP FUNCTION IF EXISTS public.portal_get_student_profile(UUID);
DROP FUNCTION IF EXISTS public.portal_get_subject_details(UUID);

-- 2. Student Results
CREATE OR REPLACE FUNCTION public.portal_get_student_results_v2(p_student_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _res JSON;
BEGIN
  SELECT json_agg(t) INTO _res FROM (
    SELECT er.id, er.total_marks, er.mean_score, er.class_position, er.class_size,
           e.name as exam_name, e.term as exam_term, e.exam_type,
           e.created_at as exam_date
    FROM exam_results er
    JOIN exams e ON e.id = er.exam_id
    WHERE er.student_id = p_student_id
      AND e.status ILIKE 'published'
    ORDER BY e.created_at DESC
  ) t;
  RETURN COALESCE(_res, '[]'::JSON);
END; $$;

-- 3. Announcements
CREATE OR REPLACE FUNCTION public.portal_get_announcements_v2(p_school_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _res JSON;
BEGIN
  SELECT json_agg(t) INTO _res FROM (
    SELECT a.id, a.title, a.body, a.created_at, u.name as author_name
    FROM announcements a
    LEFT JOIN users u ON u.id = a.created_by
    WHERE a.school_id = p_school_id
      AND a.status ILIKE 'published'
    ORDER BY a.created_at DESC
  ) t;
  RETURN COALESCE(_res, '[]'::JSON);
END; $$;

-- 4. Assignments
CREATE OR REPLACE FUNCTION public.portal_get_assignments_v2(p_school_id UUID, p_class_id UUID DEFAULT NULL)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _res JSON;
BEGIN
  SELECT json_agg(t) INTO _res FROM (
    SELECT id, title, description, due_date, subject_id, class_id, created_at
    FROM el_assignments
    WHERE school_id = p_school_id
      AND (p_class_id IS NULL OR class_id = p_class_id)
    ORDER BY created_at DESC
  ) t;
  RETURN COALESCE(_res, '[]'::JSON);
END; $$;

-- 5. Student Fees
CREATE OR REPLACE FUNCTION public.portal_get_student_fees_v2(p_student_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _res JSON;
BEGIN
  SELECT row_to_json(t) INTO _res FROM (
    SELECT f.id, f.total_fee, f.paid, f.balance
    FROM fees f
    WHERE f.student_id = p_student_id
    ORDER BY f.created_at DESC LIMIT 1
  ) t;
  RETURN COALESCE(_res, '{}'::JSON);
END; $$;

-- 6. Student Payments
CREATE OR REPLACE FUNCTION public.portal_get_student_payments_v2(p_student_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _res JSON;
BEGIN
  SELECT json_agg(t) INTO _res FROM (
    SELECT p.id, p.amount, p.date, p.method, p.reference,
           COALESCE(p.status, 'Success') as status
    FROM fee_payments p
    JOIN fees f ON f.id = p.fee_id
    WHERE f.student_id = p_student_id
      AND (p.status IS NULL OR p.status NOT ILIKE 'voided')
    ORDER BY p.date DESC
  ) t;
  RETURN COALESCE(_res, '[]'::JSON);
END; $$;

-- 7. Student Profile
CREATE OR REPLACE FUNCTION public.portal_get_student_profile(p_student_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _res JSON;
BEGIN
  SELECT row_to_json(t) INTO _res FROM (
    SELECT s.id, s.name, s.adm_no, s.class, s.stream, s.gender,
           s.parent as parent_name, s.parent_phone
    FROM students s
    WHERE s.id = p_student_id
  ) t;
  RETURN _res;
END; $$;

-- 8. Subject Details
CREATE OR REPLACE FUNCTION public.portal_get_subject_details(p_student_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _res JSON;
BEGIN
  SELECT json_agg(t) INTO _res FROM (
    SELECT sub.id, sub.name, sub.short_code as code
    FROM tt_subjects sub
    JOIN students s ON s.id = p_student_id
    WHERE sub.school_id = s.school_id
  ) t;
  RETURN COALESCE(_res, '[]'::JSON);
END; $$;

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION public.portal_get_student_results_v2(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_announcements_v2(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_assignments_v2(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_student_fees_v2(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_student_payments_v2(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_student_profile(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_subject_details(UUID) TO anon, authenticated;

-- 10. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
