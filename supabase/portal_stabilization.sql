-- ============================================================
-- PORTAL STABILIZATION SCRIPT (V11 - TABLE RETURN FIX)
-- Reverts JSONB returns to TABLE returns for better PostgREST
-- compatibility and signature matching.
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

-- 1. DYNAMIC NUKE (Ensures no signature mismatch)
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
          'portal_get_assignments'
        )
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        EXECUTE 'DROP FUNCTION ' || _func_record.signature;
    END LOOP;
END $$;

-- 2. RE-CREATE: Subject Details (RETURNS TABLE)
CREATE OR REPLACE FUNCTION public.portal_get_subject_details(p_student_id UUID)
RETURNS TABLE (
  subject_name TEXT,
  teacher_name TEXT,
  short_code TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ts.name::TEXT,
    u.name::TEXT,
    ts.short_code::TEXT
  FROM public.students s
  JOIN public.classes c ON (c.id = s.class_id OR (c.name = s.class AND c.school_id = s.school_id))
  JOIN public.tt_teacher_subjects tts ON tts.class_id = c.id
  JOIN public.tt_subjects ts ON ts.id = tts.subject_id
  JOIN public.users u ON u.id = tts.teacher_id
  WHERE s.id = p_student_id;
END; $$;

-- 3. RE-CREATE: Student Results (RETURNS TABLE)
CREATE OR REPLACE FUNCTION public.portal_get_student_results(p_student_id UUID)
RETURNS TABLE (
  id UUID,
  total_marks NUMERIC,
  mean_score NUMERIC,
  class_position INTEGER,
  class_size INTEGER,
  exam_name TEXT,
  exam_term TEXT,
  exam_type TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN QUERY
  SELECT 
    er.id,
    er.total_marks,
    er.mean_score,
    er.class_position,
    er.class_size,
    e.name::TEXT as exam_name,
    e.term::TEXT as exam_term,
    e.exam_type::TEXT as exam_type
  FROM public.exam_results er 
  JOIN public.exams e ON e.id = er.exam_id
  WHERE er.student_id = p_student_id 
    AND e.status ILIKE 'published'
  ORDER BY e.created_at DESC;
END; $$;

-- 4. RE-CREATE: Announcements (RETURNS TABLE)
CREATE OR REPLACE FUNCTION public.portal_get_announcements(p_school_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  body TEXT,
  created_at TIMESTAMPTZ,
  author_name TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title::TEXT,
    a.body::TEXT,
    a.created_at,
    u.name::TEXT as author_name
  FROM public.announcements a 
  LEFT JOIN public.users u ON u.id = a.created_by
  WHERE a.school_id = p_school_id 
    AND a.status ILIKE 'published' 
  ORDER BY a.created_at DESC;
END; $$;

-- 5. RE-CREATE: Assignments (RETURNS SETOF el_assignments)
CREATE OR REPLACE FUNCTION public.portal_get_assignments(p_school_id UUID, p_class_id UUID DEFAULT NULL)
RETURNS SETOF public.el_assignments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.el_assignments 
  WHERE school_id = p_school_id 
    AND (p_class_id IS NULL OR class_id = p_class_id) 
  ORDER BY created_at DESC;
END; $$;

-- 6. DATA RECOVERY
DO $$ 
BEGIN
  -- Fix missing class_ids
  UPDATE public.students s
  SET class_id = c.id
  FROM public.classes c
  WHERE s.class_id IS NULL AND c.name = s.class AND c.school_id = s.school_id;

  -- Migrate legacy assignments
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subject_assignments') THEN
    INSERT INTO public.tt_teacher_subjects (school_id, teacher_id, subject_id, class_id)
    SELECT DISTINCT sa.school_id, v.target_user_id, ts.id, c.id
    FROM (
      SELECT *, COALESCE((SELECT user_id FROM public.teachers WHERE id = sa.teacher_id), sa.teacher_id) as target_user_id
      FROM public.subject_assignments sa
    ) sa
    JOIN public.tt_subjects ts ON ts.name = sa.subject AND ts.school_id = sa.school_id
    JOIN public.classes c ON c.name = sa.class_grade AND c.school_id = sa.school_id
    WHERE EXISTS (SELECT 1 FROM public.users WHERE id = sa.target_user_id)
    ON CONFLICT (teacher_id, subject_id, class_id) DO NOTHING;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration failed: %', SQLERRM;
END $$;
