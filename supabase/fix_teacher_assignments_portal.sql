-- ============================================================
-- FIX: Teacher Assignments & Papers Visibility
-- Problem: Teachers cannot see their assigned classes/subjects
-- because the RPCs were querying the wrong tables or using 
-- inconsistent ID matching logic.
-- ============================================================

-- 1. Fix portal_get_teacher_assignments
-- Queries BOTH the new 'teacher_assignments' and legacy 'subject_assignments'
CREATE OR REPLACE FUNCTION public.portal_get_teacher_assignments(p_school_id UUID, p_period_id UUID, p_teacher_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(DISTINCT assignments), '[]'::jsonb)
    FROM (
      -- a) New Unified Table
      SELECT jsonb_build_object(
        'id', ta.id, 
        'class_grade', cs.level, 
        'stream', cs.name, 
        'subject', ta.subject,
        'table', 'teacher_assignments'
      ) as assignments
      FROM public.teacher_assignments ta
      JOIN public.class_streams cs ON ta.stream_id = cs.id
      WHERE ta.school_id = p_school_id 
        AND ta.period_id = p_period_id
        AND ta.is_active = true
        AND (
          ta.teacher_id = p_teacher_id 
          OR ta.teacher_id IN (SELECT id FROM public.teachers WHERE id = p_teacher_id OR user_id = p_teacher_id)
          OR ta.teacher_id IN (SELECT user_id FROM public.teachers WHERE id = p_teacher_id OR user_id = p_teacher_id)
        )
      
      UNION ALL
      
      -- b) Legacy Table
      SELECT jsonb_build_object(
        'id', sa.id, 
        'class_grade', sa.class_grade, 
        'stream', sa.stream, 
        'subject', sa.subject,
        'table', 'subject_assignments'
      ) as assignments
      FROM public.subject_assignments sa
      WHERE sa.school_id = p_school_id 
        AND sa.period_id = p_period_id
        AND (
          sa.teacher_id = p_teacher_id 
          OR sa.teacher_id IN (SELECT id FROM public.teachers WHERE id = p_teacher_id OR user_id = p_teacher_id)
          OR sa.teacher_id IN (SELECT user_id FROM public.teachers WHERE id = p_teacher_id OR user_id = p_teacher_id)
        )
    ) sub
  );
END; $$;

-- 2. Fix portal_get_teacher_papers
-- Ensures classes and subjects are joined correctly regardless of schema
CREATE OR REPLACE FUNCTION public.portal_get_teacher_papers(p_teacher_id UUID, p_exam_id UUID)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ep.id,
        'exam_id', ep.exam_id,
        'class_id', ep.class_id,
        'subject_id', ep.subject_id,
        'teacher_id', ep.teacher_id,
        'max_score', ep.max_score,
        'marks_entered', ep.marks_entered,
        'classes', jsonb_build_object('name', c.name, 'stream', c.stream),
        'tt_subjects', jsonb_build_object('name', ts.name)
      )
    ), '[]'::jsonb)
    FROM public.exam_papers ep
    JOIN public.classes c ON c.id = ep.class_id
    JOIN public.tt_subjects ts ON ts.id = ep.subject_id
    WHERE ep.exam_id = p_exam_id
      AND (
        ep.teacher_id = p_teacher_id
        OR ep.teacher_id IN (SELECT id FROM public.teachers WHERE id = p_teacher_id OR user_id = p_teacher_id)
        OR ep.teacher_id IN (SELECT user_id FROM public.teachers WHERE id = p_teacher_id OR user_id = p_teacher_id)
      )
  );
END;
$$;
