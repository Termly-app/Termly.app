-- Fix Teacher Portal Grading Stability
-- 1. Drop existing functions with conflicting signatures
DROP FUNCTION IF EXISTS public.portal_get_open_exams(uuid);
DROP FUNCTION IF EXISTS public.portal_ensure_teacher_papers(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.portal_get_teacher_papers(uuid, uuid);

-- 2. Implementation of portal_get_open_exams
CREATE OR REPLACE FUNCTION public.portal_get_open_exams(p_school_id uuid)
RETURNS TABLE (
    id uuid,
    name text,
    term text,
    exam_type text,
    status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id, 
        e.name, 
        e.term, 
        e.exam_type, 
        e.status
    FROM public.exams e
    WHERE e.school_id = p_school_id
      AND e.status IN ('open', 'published', 'setup', 'active')
    ORDER BY e.created_at DESC;
END;
$$;

-- 3. Implementation of portal_ensure_teacher_papers
-- This function ensures that if a teacher is assigned to a subject/class, 
-- they have an exam_paper record for that exam.
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
    -- 1. Insert missing papers from subject_assignments
    INSERT INTO public.exam_papers (exam_id, school_id, class_id, subject_id, teacher_id)
    SELECT 
        p_exam_id, 
        p_school_id, 
        sa.class_id, 
        sa.subject_id, 
        p_teacher_id
    FROM public.subject_assignments sa
    WHERE sa.school_id = p_school_id
      AND (sa.teacher_id = p_teacher_id OR sa.teacher_id IN (SELECT user_id FROM teachers WHERE id = p_teacher_id))
      AND sa.is_active = true
    ON CONFLICT (exam_id, class_id, subject_id) DO UPDATE 
    SET teacher_id = EXCLUDED.teacher_id -- Update teacher if it changed
    WHERE public.exam_papers.teacher_id IS NULL;

    -- 2. Return the papers
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
