-- ============================================================
-- PORTAL STABILIZATION SCRIPT (V5)
-- Fixes mismatches in Parent/Staff portal RPCs and schemas.
-- ============================================================

-- 1. Fix portal_get_subject_details (Fixes "sa.subject_id does not exist")
CREATE OR REPLACE FUNCTION public.portal_get_subject_details(p_student_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'subject_name', ts.name,
      'teacher_name', u.name,
      'teacher_photo', u.photo_url,
      'short_code', ts.short_code
    )), '[]'::jsonb)
    FROM public.students s
    JOIN public.classes c ON c.name = s.class AND c.school_id = s.school_id
    JOIN public.tt_teacher_subjects tts ON tts.class_id = c.id
    JOIN public.tt_subjects ts ON ts.id = tts.subject_id
    JOIN public.users u ON u.id = tts.teacher_id
    WHERE s.id = p_student_id
  );
END; $$;

-- 2. Fix portal_get_student_results (Ensures correct JSONB return)
CREATE OR REPLACE FUNCTION public.portal_get_student_results(p_student_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', er.id, 
      'student_id', er.student_id, 
      'exam_id', er.exam_id, 
      'total_marks', er.total_marks, 
      'mean_score', er.mean_score, 
      'class_position', er.class_position, 
      'class_size', er.class_size, 
      'exams', jsonb_build_object(
        'name', e.name, 
        'term', e.term, 
        'exam_type', e.exam_type
      )
    )), '[]'::jsonb)
    FROM public.exam_results er 
    JOIN public.exams e ON e.id = er.exam_id
    WHERE er.student_id = p_student_id 
      AND e.status ILIKE 'published'
    ORDER BY e.created_at DESC
  );
END; $$;

-- 3. Fix portal_get_announcements (Ensures JSONB return)
CREATE OR REPLACE FUNCTION public.portal_get_announcements(p_school_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', a.id, 
      'title', a.title, 
      'body', a.body, 
      'status', a.status, 
      'created_at', a.created_at, 
      'author_name', u.name
    )), '[]'::jsonb)
    FROM public.announcements a 
    LEFT JOIN public.users u ON u.id = a.created_by
    WHERE a.school_id = p_school_id 
      AND a.status ILIKE 'published' 
    ORDER BY a.created_at DESC
  );
END; $$;

-- 4. Fix portal_get_assignments (Standardize parameters and return)
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

-- 5. Helper to ensure classes can be found by name if class_id is missing on student
-- Some older students might only have 'class' (text) set.
UPDATE public.students s
SET class_id = c.id
FROM public.classes c
WHERE s.class_id IS NULL 
  AND c.name = s.class 
  AND c.school_id = s.school_id;
