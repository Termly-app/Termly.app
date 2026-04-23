-- ============================================================
-- PORTAL STABILIZATION SCRIPT (V13 - FINANCE INTEGRITY FIX)
-- Adds Finance RPCs with status filtering to prevent voided
-- payments from inflating totals.
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

-- 1. DYNAMIC NUKE
DO $$ 
DECLARE
    _func_record record;
BEGIN
    FOR _func_record IN 
        SELECT oid::regprocedure as signature
        FROM pg_proc 
        WHERE proname IN (
          'portal_get_subject_details', 
          'portal_get_student_results', 
          'portal_get_announcements', 
          'portal_get_assignments',
          'portal_get_student_fees',
          'portal_get_student_payments'
        )
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        EXECUTE 'DROP FUNCTION ' || _func_record.signature;
    END LOOP;
END $$;

-- 2. RE-CREATE: Subject Details (Dual-Aware)
CREATE OR REPLACE FUNCTION public.portal_get_subject_details(p_student_id UUID)
RETURNS TABLE (
  subject_name TEXT,
  teacher_name TEXT,
  short_code TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN QUERY
  WITH student_info AS (
    SELECT s.school_id, s.class, s.class_id, s.stream
    FROM public.students s
    WHERE s.id = p_student_id
  ),
  all_assignments AS (
    SELECT ts.name::TEXT as s_name, u.name::TEXT as t_name, ts.short_code::TEXT as s_code, 1 as priority
    FROM student_info si
    JOIN public.classes c ON (c.id = si.class_id OR (c.name = si.class AND c.school_id = si.school_id))
    JOIN public.tt_teacher_subjects tts ON tts.class_id = c.id
    JOIN public.tt_subjects ts ON ts.id = tts.subject_id
    JOIN public.users u ON u.id = tts.teacher_id
    UNION ALL
    SELECT sa.subject::TEXT as s_name, u.name::TEXT as t_name, ''::TEXT as s_code, 2 as priority
    FROM student_info si
    JOIN public.subject_assignments sa ON sa.school_id = si.school_id AND sa.class_grade = si.class 
      AND (sa.stream = si.stream OR sa.stream IS NULL OR sa.stream = '' OR sa.stream = 'General')
    JOIN public.users u ON u.id = sa.teacher_id
  )
  SELECT DISTINCT ON (s_name) s_name, t_name, s_code FROM all_assignments ORDER BY s_name, priority ASC;
END; $$;

-- 3. RE-CREATE: Student Results
CREATE OR REPLACE FUNCTION public.portal_get_student_results_v2(p_student_id UUID)
RETURNS TABLE (
  id UUID, total_marks NUMERIC, mean_score NUMERIC, class_position INTEGER, class_size INTEGER, exam_name TEXT, exam_term TEXT, exam_type TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN QUERY
  SELECT er.id, er.total_marks, er.mean_score, er.class_position, er.class_size, e.name::TEXT, e.term::TEXT, e.exam_type::TEXT
  FROM public.exam_results er JOIN public.exams e ON e.id = er.exam_id
  WHERE er.student_id = p_student_id AND e.status ILIKE 'published' ORDER BY e.created_at DESC;
END; $$;

-- 4. RE-CREATE: Announcements
CREATE OR REPLACE FUNCTION public.portal_get_announcements_v2(p_school_id UUID)
RETURNS TABLE (
  id UUID, title TEXT, body TEXT, created_at TIMESTAMPTZ, author_name TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.title::TEXT, a.body::TEXT, a.created_at, u.name::TEXT
  FROM public.announcements a LEFT JOIN public.users u ON u.id = a.created_by
  WHERE a.school_id = p_school_id AND a.status ILIKE 'published' ORDER BY a.created_at DESC;
END; $$;

-- 5. RE-CREATE: Assignments
CREATE OR REPLACE FUNCTION public.portal_get_assignments_v2(p_school_id UUID, p_class_id UUID DEFAULT NULL)
RETURNS SETOF public.el_assignments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.el_assignments WHERE school_id = p_school_id AND (p_class_id IS NULL OR class_id = p_class_id) ORDER BY created_at DESC;
END; $$;

-- 6. RE-CREATE: Student Fees (RETURNS TABLE for consistency)
CREATE OR REPLACE FUNCTION public.portal_get_student_fees_v2(p_student_id UUID)
RETURNS TABLE (
  id UUID, total_fee NUMERIC, paid NUMERIC, balance NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.total_fee, f.paid, f.balance
  FROM public.fees f
  WHERE f.student_id = p_student_id
  ORDER BY f.created_at DESC LIMIT 1;
END; $$;

-- 7. RE-CREATE: Student Payments (Harden: Exclude Voided)
CREATE OR REPLACE FUNCTION public.portal_get_student_payments_v2(p_student_id UUID)
RETURNS TABLE (
  id UUID, amount NUMERIC, date TIMESTAMPTZ, method TEXT, reference TEXT, status TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, p.amount, p.date::TIMESTAMPTZ, p.method, p.reference, 
    COALESCE(p.status, 'Success') as status
  FROM public.fee_payments p
  JOIN public.fees f ON f.id = p.fee_id
  WHERE f.student_id = p_student_id 
    AND (p.status IS NULL OR p.status NOT ILIKE 'voided')
  ORDER BY p.date DESC;
END; $$;

-- 8. RELOAD SCHEMA CACHE
-- Forces PostgREST to recognize the new TABLE return types immediately
NOTIFY pgrst, 'reload schema';
