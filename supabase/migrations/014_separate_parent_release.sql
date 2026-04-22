-- 1. Add released_to_parents column to exams
ALTER TABLE public.exams 
  ADD COLUMN IF NOT EXISTS released_to_parents BOOLEAN DEFAULT FALSE;

-- 2. Update existing 'published' exams to be released_to_parents = true
UPDATE public.exams 
SET released_to_parents = TRUE 
WHERE status ILIKE 'published';

-- 3. Update the Parent Portal results RPC to use the new flag
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
      AND e.released_to_parents = TRUE -- USE THE NEW FLAG
    ORDER BY e.created_at DESC
  );
END; $$;
