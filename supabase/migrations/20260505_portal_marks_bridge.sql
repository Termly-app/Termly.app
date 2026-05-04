-- ============================================================
-- 20260505: Bridge Portal Grading to Legacy Marks Table
-- Problem: Portal uses exam_papers/exam_marks (UUID-based),
-- but admin uses the marks table (text-based). Schools without
-- classes/tt_subjects records can never create exam_papers.
-- Solution: Let the portal read/write the marks table directly.
-- ============================================================

-- 1. Read marks for a class/subject/exam from the marks table
DROP FUNCTION IF EXISTS public.portal_get_class_marks(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.portal_get_class_marks(
    p_school_id uuid,
    p_class_name text,
    p_subject text,
    p_exam_type text
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'student_id', m.student_id,
            'raw_score', m.mark,
            'is_absent', false
        )), '[]'::jsonb)
        FROM public.marks m
        JOIN public.students s ON s.id = m.student_id
        WHERE m.school_id = p_school_id
          AND m.subject = p_subject
          AND m.exam_type = p_exam_type
          AND s.class = p_class_name
    );
END;
$$;

-- 2. Save marks to the marks table from portal
DROP FUNCTION IF EXISTS public.portal_save_class_marks(jsonb);

CREATE OR REPLACE FUNCTION public.portal_save_class_marks(p_marks jsonb)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    mark_record jsonb;
BEGIN
    FOR mark_record IN SELECT * FROM jsonb_array_elements(p_marks)
    LOOP
        INSERT INTO public.marks (
            school_id, student_id, subject, mark, exam_type, period_id
        ) VALUES (
            (mark_record->>'school_id')::uuid,
            (mark_record->>'student_id')::uuid,
            mark_record->>'subject',
            CASE 
                WHEN mark_record->>'mark' IS NULL OR mark_record->>'mark' = '' THEN NULL
                ELSE (mark_record->>'mark')::integer
            END,
            mark_record->>'exam_type',
            CASE 
                WHEN mark_record->>'period_id' IS NOT NULL AND mark_record->>'period_id' != '' 
                THEN (mark_record->>'period_id')::uuid
                ELSE NULL
            END
        )
        ON CONFLICT (school_id, student_id, subject, period_id, exam_type)
        DO UPDATE SET 
            mark = CASE 
                WHEN (mark_record->>'mark') IS NULL OR (mark_record->>'mark') = '' THEN NULL
                ELSE (mark_record->>'mark')::integer
            END;
    END LOOP;
    RETURN TRUE;
END;
$$;

-- 3. Get students by class name (text-based, bypasses RLS)
DROP FUNCTION IF EXISTS public.portal_get_students_by_class_name(uuid, text);

CREATE OR REPLACE FUNCTION public.portal_get_students_by_class_name(
    p_school_id uuid,
    p_class_name text
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'adm_no', s.adm_no,
            'class', s.class,
            'stream', s.stream,
            'admNo', s.adm_no
        ) ORDER BY s.name ASC), '[]'::jsonb)
        FROM public.students s
        WHERE s.school_id = p_school_id
          AND s.class = p_class_name
          AND (s.is_active = true OR s.is_active IS NULL)
    );
END;
$$;
