-- 1. Upgrade fee_payments to support high-precision timestamps
ALTER TABLE public.fee_payments 
  ALTER COLUMN date TYPE TIMESTAMPTZ USING date::TIMESTAMPTZ,
  ALTER COLUMN date SET DEFAULT NOW();

-- 2. Strictly filter Parent Portal results to 'published' only
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
      AND e.status ILIKE 'published' -- ONLY PUBLISHED RESULTS
    ORDER BY e.created_at DESC
  );
END; $$;

-- 3. Add Subject Details / Teacher Lookup for Parents
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
    JOIN public.tt_teacher_subjects tts ON tts.class_id = s.class_id
    JOIN public.tt_subjects ts ON ts.id = tts.subject_id
    JOIN public.users u ON u.id = tts.teacher_id
    WHERE s.id = p_student_id
  );
END; $$;

-- 4. Update payments lookup to include minutes
CREATE OR REPLACE FUNCTION public.portal_get_student_payments(p_student_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'amount', p.amount,
      'date', p.date, -- Now returns full timestamp
      'method', p.method,
      'reference', p.reference
    ) ORDER BY p.date DESC), '[]'::jsonb)
    FROM public.fee_payments p
    JOIN public.fees f ON f.id = p.fee_id
    WHERE f.student_id = p_student_id
  );
END; $$;
