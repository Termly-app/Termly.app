-- ============================================================
-- 008_PORTAL_SYNC_RPCS.SQL — Portal Data Access Functions
-- These functions allow Staff and Parent portals to fetch
-- and update data safely without a standard Supabase Auth session.
-- ============================================================

-- 1. Get Open Exams for School
CREATE OR REPLACE FUNCTION public.portal_get_open_exams(p_school_id UUID)
RETURNS SETOF public.exams AS $$
  SELECT * FROM public.exams WHERE school_id = p_school_id AND status = 'open';
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Get Academic Periods for School
CREATE OR REPLACE FUNCTION public.portal_get_periods(p_school_id UUID)
RETURNS SETOF public.academic_periods AS $$
  SELECT * FROM public.academic_periods WHERE school_id = p_school_id ORDER BY year DESC, term DESC;
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Get School Profile
CREATE OR REPLACE FUNCTION public.portal_get_school_profile(p_school_id UUID)
RETURNS SETOF public.school_profiles AS $$
  SELECT * FROM public.school_profiles WHERE school_id = p_school_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Get Exam Papers for Teacher
CREATE OR REPLACE FUNCTION public.portal_get_teacher_papers(p_teacher_id UUID, p_exam_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ep.id,
        'exam_id', ep.exam_id,
        'class_id', ep.class_id,
        'subject_id', ep.subject_id,
        'max_score', ep.max_score,
        'marks_entered', ep.marks_entered,
        'classes', jsonb_build_object('name', c.name, 'stream', c.stream),
        'tt_subjects', jsonb_build_object('name', ts.name)
      )
    ), '[]'::jsonb)
    FROM public.exam_papers ep
    JOIN public.classes c ON c.id = ep.class_id
    JOIN public.tt_subjects ts ON ts.id = ep.subject_id
    WHERE ep.teacher_id = p_teacher_id AND ep.exam_id = p_exam_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Get Class Students
CREATE OR REPLACE FUNCTION public.portal_get_class_students(p_school_id UUID, p_class_id UUID)
RETURNS SETOF public.students AS $$
  SELECT * FROM public.students 
  WHERE class_id = p_class_id AND school_id = p_school_id AND is_active = true
  ORDER BY name ASC;
$$ LANGUAGE sql SECURITY DEFINER;

-- 6. Get Exam Marks for Paper
CREATE OR REPLACE FUNCTION public.portal_get_exam_marks(p_school_id UUID, p_paper_id UUID)
RETURNS SETOF public.exam_marks AS $$
  SELECT * FROM public.exam_marks WHERE exam_paper_id = p_paper_id AND school_id = p_school_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 7. Save Exam Marks
CREATE OR REPLACE FUNCTION public.portal_save_exam_marks(p_marks JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  mark_record JSONB;
BEGIN
  FOR mark_record IN SELECT * FROM jsonb_array_elements(p_marks)
  LOOP
    INSERT INTO public.exam_marks (
      exam_paper_id, student_id, school_id, raw_score, converted_score, is_absent
    ) VALUES (
      CAST(mark_record->>'exam_paper_id' AS UUID),
      CAST(mark_record->>'student_id' AS UUID),
      CAST(mark_record->>'school_id' AS UUID),
      CAST(mark_record->>'raw_score' AS DECIMAL),
      CAST(mark_record->>'converted_score' AS DECIMAL),
      CAST(mark_record->>'is_absent' AS BOOLEAN)
    )
    ON CONFLICT (exam_paper_id, student_id)
    DO UPDATE SET 
      raw_score = EXCLUDED.raw_score,
      converted_score = EXCLUDED.converted_score,
      is_absent = EXCLUDED.is_absent,
      updated_at = NOW();
  END LOOP;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Get Student Fees (for Parent Portal)
CREATE OR REPLACE FUNCTION public.portal_get_student_fees(p_student_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'id', f.id,
      'total_fee', f.total_fee,
      'paid', f.paid,
      'balance', f.balance,
      'period_id', f.period_id
    )
    FROM public.fees f
    WHERE f.student_id = p_student_id
    ORDER BY f.created_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Get Student Payments (for Parent Portal)
CREATE OR REPLACE FUNCTION public.portal_get_student_payments(p_student_id UUID)
RETURNS SETOF public.fee_payments AS $$
  SELECT * FROM public.fee_payments WHERE student_id = p_student_id ORDER BY date DESC;
$$ LANGUAGE sql SECURITY DEFINER;

-- 10. Get Student Exam Results (for Parent Portal)
CREATE OR REPLACE FUNCTION public.portal_get_student_results(p_student_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', er.id,
        'total_marks', er.total_marks,
        'total_subjects', er.total_subjects,
        'mean_score', er.mean_score,
        'class_position', er.class_position,
        'class_size', er.class_size,
        'exam_id', er.exam_id,
        'exam_info', jsonb_build_object('name', e.name, 'term', e.term, 'exam_type', e.exam_type)
      )
    ), '[]'::jsonb)
    FROM public.exam_results er
    JOIN public.exams e ON e.id = er.exam_id
    WHERE er.student_id = p_student_id AND e.status = 'published'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Get Announcements
CREATE OR REPLACE FUNCTION public.portal_get_announcements(p_school_id UUID)
RETURNS SETOF public.announcements AS $$
  SELECT * FROM public.announcements 
  WHERE school_id = p_school_id AND status = 'published'
  ORDER BY created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER;
