-- Fix Teacher Portal Grading Stability
-- 1. Drop existing functions with conflicting signatures
DROP FUNCTION IF EXISTS public.portal_get_open_exams(uuid);
DROP FUNCTION IF EXISTS public.portal_ensure_teacher_papers(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.portal_get_teacher_papers(uuid, uuid);

-- 2. Implementation of portal_get_open_exams
-- Returning JSONB to be consistent with project convention
CREATE OR REPLACE FUNCTION public.portal_get_open_exams(p_school_id uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', e.id, 
            'name', e.name, 
            'term', e.term, 
            'exam_type', e.exam_type, 
            'status', e.status
        )), '[]'::jsonb)
        FROM public.exams e
        WHERE e.school_id = p_school_id
          AND e.status IN ('open', 'published', 'setup', 'active')
        ORDER BY e.created_at DESC
    );
END;
$$;

-- 3. Implementation of portal_ensure_teacher_papers
-- This function ensures that if a teacher is assigned to a subject/class, 
-- they have an exam_paper record for that exam.
-- Handles mapping from legacy subject_assignments (TEXT) to new schema (UUID).
CREATE OR REPLACE FUNCTION public.portal_ensure_teacher_papers(
    p_teacher_id uuid,
    p_exam_id uuid,
    p_school_id uuid
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_paper RECORD;
BEGIN
    -- 1. Insert missing papers from legacy subject_assignments
    -- We map class_grade -> classes.name and subject -> tt_subjects.name
    INSERT INTO public.exam_papers (exam_id, school_id, class_id, subject_id, teacher_id)
    SELECT 
        p_exam_id, 
        p_school_id, 
        c.id, 
        ts.id, 
        p_teacher_id
    FROM public.subject_assignments sa
    JOIN public.classes c ON (c.school_id = sa.school_id AND c.name = sa.class_grade AND c.stream = sa.stream)
    JOIN public.tt_subjects ts ON (ts.school_id = sa.school_id AND ts.name = sa.subject)
    WHERE sa.school_id = p_school_id
      AND (sa.teacher_id = p_teacher_id OR sa.teacher_id IN (SELECT id FROM teachers WHERE user_id = p_teacher_id))
    ON CONFLICT (exam_id, class_id, subject_id) DO UPDATE 
    SET teacher_id = EXCLUDED.teacher_id
    WHERE public.exam_papers.teacher_id IS NULL;

    -- 2. Also check new tt_teacher_subjects table just in case
    INSERT INTO public.exam_papers (exam_id, school_id, class_id, subject_id, teacher_id)
    SELECT 
        p_exam_id, 
        p_school_id, 
        tts.class_id, 
        tts.subject_id, 
        p_teacher_id
    FROM public.tt_teacher_subjects tts
    WHERE tts.school_id = p_school_id
      AND (tts.teacher_id = p_teacher_id OR tts.teacher_id IN (SELECT id FROM users WHERE auth_user_id = p_teacher_id))
    ON CONFLICT (exam_id, class_id, subject_id) DO UPDATE 
    SET teacher_id = EXCLUDED.teacher_id
    WHERE public.exam_papers.teacher_id IS NULL;

    -- 3. Return the papers
    RETURN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', ep.id,
            'exam_id', ep.exam_id,
            'class_id', ep.class_id,
            'subject_id', ep.subject_id,
            'max_score', ep.max_score,
            'marks_entered', ep.marks_entered,
            'classes', jsonb_build_object('name', c.name, 'stream', c.stream),
            'tt_subjects', jsonb_build_object('name', ts.name)
        )), '[]'::jsonb)
        FROM public.exam_papers ep
        LEFT JOIN public.classes c ON c.id = ep.class_id
        LEFT JOIN public.tt_subjects ts ON ts.id = ep.subject_id
        WHERE ep.exam_id = p_exam_id
          AND ep.teacher_id = p_teacher_id
    );
END;
$$;

-- 4. Implementation of portal_get_teacher_papers (Fallback)
CREATE OR REPLACE FUNCTION public.portal_get_teacher_papers(p_teacher_id uuid, p_exam_id uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', ep.id,
            'exam_id', ep.exam_id,
            'class_id', ep.class_id,
            'subject_id', ep.subject_id,
            'max_score', ep.max_score,
            'marks_entered', ep.marks_entered,
            'classes', jsonb_build_object('name', c.name, 'stream', c.stream),
            'tt_subjects', jsonb_build_object('name', ts.name)
        )), '[]'::jsonb)
        FROM public.exam_papers ep
        LEFT JOIN public.classes c ON c.id = ep.class_id
        LEFT JOIN public.tt_subjects ts ON ts.id = ep.subject_id
        WHERE ep.exam_id = p_exam_id
          AND ep.teacher_id = p_teacher_id
    );
END;
$$;
