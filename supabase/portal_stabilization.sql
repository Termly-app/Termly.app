-- ============================================================
-- PORTAL STABILIZATION SCRIPT (V10 - THE NUKE)
-- This version uses dynamic SQL to drop ALL overloaded portal 
-- functions and re-creates them with absolute consistency.
-- ============================================================

-- 0. Ensure Infrastructure
CREATE TABLE IF NOT EXISTS public.tt_teacher_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.tt_subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_id)
);

-- 1. DYNAMIC NUKE: Drop ALL overloaded versions of these functions
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
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Nuke failed: %', SQLERRM;
END $$;

-- 2. RE-CREATE: Subject Details (Hardened, no photo_url)
CREATE OR REPLACE FUNCTION public.portal_get_subject_details(p_student_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'subject_name', ts.name,
      'teacher_name', u.name,
      'short_code', ts.short_code
    )), '[]'::jsonb)
    FROM public.students s
    JOIN public.classes c ON (c.id = s.class_id OR (c.name = s.class AND c.school_id = s.school_id))
    JOIN public.tt_teacher_subjects tts ON tts.class_id = c.id
    JOIN public.tt_subjects ts ON ts.id = tts.subject_id
    JOIN public.users u ON u.id = tts.teacher_id
    WHERE s.id = p_student_id
  );
END; $$;

-- 3. RE-CREATE: Student Results
CREATE OR REPLACE FUNCTION public.portal_get_student_results(p_student_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', er.id, 
      'total_marks', er.total_marks, 
      'mean_score', er.mean_score, 
      'class_position', er.class_position, 
      'class_size', er.class_size, 
      'exams', jsonb_build_object('name', e.name, 'term', e.term, 'exam_type', e.exam_type)
    )), '[]'::jsonb)
    FROM public.exam_results er 
    JOIN public.exams e ON e.id = er.exam_id
    WHERE er.student_id = p_student_id 
      AND e.status ILIKE 'published'
    ORDER BY e.created_at DESC
  );
END; $$;

-- 4. RE-CREATE: Announcements
CREATE OR REPLACE FUNCTION public.portal_get_announcements(p_school_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', a.id, 'title', a.title, 'body', a.body, 'created_at', a.created_at, 'author_name', u.name
    )), '[]'::jsonb)
    FROM public.announcements a 
    LEFT JOIN public.users u ON u.id = a.created_by
    WHERE a.school_id = p_school_id 
      AND a.status ILIKE 'published' 
    ORDER BY a.created_at DESC
  );
END; $$;

-- 5. RE-CREATE: Assignments (Matching 2-parameter call in store.js)
CREATE OR REPLACE FUNCTION public.portal_get_assignments(p_school_id UUID, p_class_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) 
    FROM (
      SELECT * FROM public.el_assignments 
      WHERE school_id = p_school_id 
        AND (p_class_id IS NULL OR class_id = p_class_id) 
      ORDER BY created_at DESC
    ) t
  );
END; $$;

-- 6. DATA RECOVERY: Safe Migration
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
  RAISE NOTICE 'Migration step failed but script continuing: %', SQLERRM;
END $$;
