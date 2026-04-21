-- ============================================================
-- 010_COMPLETE_PORTAL_RPCS.SQL (V3 - ROBUST VERSION)
-- Implement missing RPCs for Parent and Teacher portals.
-- Fixed: Matches the actual table schema (total_fee, paid)
-- Fixed: Case-insensitive status filtering (ILIKE)
-- ============================================================

-- ─── 1. Get School Profile ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.portal_get_school_profile(p_school_id UUID)
RETURNS TABLE (id UUID, school_id UUID, name TEXT, logo_url TEXT, motto TEXT, address TEXT, phone TEXT, email TEXT, website TEXT, custom_exams JSONB, grading_systems JSONB, currency TEXT, academic_year TEXT, term_dates JSONB, social_links JSONB) 
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN QUERY SELECT sp.id, sp.school_id, sp.name, sp.logo_url, sp.motto, sp.address, sp.phone, sp.email, sp.website, sp.custom_exams, sp.grading_systems, sp.currency, sp.academic_year, sp.term_dates, sp.social_links
  FROM public.school_profiles sp WHERE sp.school_id = p_school_id;
END; $$;

-- ─── 2. Get Academic Periods ────────────────────────────────
CREATE OR REPLACE FUNCTION public.portal_get_periods(p_school_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'year', year, 'term', term, 'is_active', is_active, 'school_id', school_id)), '[]'::jsonb)
  FROM public.academic_periods WHERE school_id = p_school_id ORDER BY year DESC, term DESC);
END; $$;

-- ─── 3. Get Active Exams (Case-Insensitive & Lenient) ────────
CREATE OR REPLACE FUNCTION public.portal_get_exams(p_school_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'term', term, 'exam_type', exam_type, 'status', status, 'school_id', school_id, 'created_at', created_at)), '[]'::jsonb)
  FROM public.exams WHERE school_id = p_school_id AND status NOT ILIKE 'Draft' ORDER BY created_at DESC);
END; $$;

-- ─── 4. Get Announcements (Case-Insensitive) ────────────────
CREATE OR REPLACE FUNCTION public.portal_get_announcements(p_school_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'body', a.body, 'status', a.status, 'created_at', a.created_at, 'author_name', u.name)), '[]'::jsonb)
  FROM public.announcements a LEFT JOIN public.users u ON u.id = a.created_by
  WHERE a.school_id = p_school_id AND a.status ILIKE 'published' ORDER BY a.created_at DESC);
END; $$;

-- ─── 5. Get Student Results (Case-Insensitive) ──────────────
CREATE OR REPLACE FUNCTION public.portal_get_student_results(p_student_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', er.id, 'student_id', er.student_id, 'exam_id', er.exam_id, 'total_marks', er.total_marks, 'mean_score', er.mean_score, 'class_position', er.class_position, 'class_size', er.class_size, 'exams', jsonb_build_object('name', e.name, 'term', e.term, 'exam_type', e.exam_type))), '[]'::jsonb)
  FROM public.exam_results er JOIN public.exams e ON e.id = er.exam_id
  WHERE er.student_id = p_student_id AND e.status NOT ILIKE 'Draft' ORDER BY e.created_at DESC);
END; $$;

-- ─── 6. Get Student Fees (FIXED: Uses actual schema) ────────
CREATE OR REPLACE FUNCTION public.portal_get_student_fees(p_student_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_total_fee NUMERIC; v_paid NUMERIC;
BEGIN
  -- Sum up from all fee records for this student
  SELECT COALESCE(SUM(total_fee), 0), COALESCE(SUM(paid), 0)
  INTO v_total_fee, v_paid
  FROM public.fees
  WHERE student_id = p_student_id;
  
  RETURN jsonb_build_object(
    'total_fee', v_total_fee,
    'paid', v_paid,
    'balance', v_total_fee - v_paid
  );
END; $$;

-- ─── 7. Get Teacher Timetable ───────────────────────────────
CREATE OR REPLACE FUNCTION public.portal_get_teacher_timetable(p_school_id UUID, p_period_id UUID, p_teacher_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'day_of_week', day_of_week, 'slot_index', slot_index, 'subject', subject, 'class_grade', class_grade, 'stream', stream, 'start_time', start_time, 'end_time', end_time)), '[]'::jsonb)
  FROM public.timetable_slots WHERE school_id = p_school_id AND period_id = p_period_id AND teacher_id = p_teacher_id ORDER BY slot_index ASC);
END; $$;

-- ─── 8. Get Timetable Config ───────────────────────────────
CREATE OR REPLACE FUNCTION public.portal_get_timetable_config(p_school_id UUID, p_period_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'slot_index', slot_index, 'start_time', start_time, 'end_time', end_time, 'is_break', is_break, 'label', label)), '[]'::jsonb)
  FROM public.timetable_configs WHERE school_id = p_school_id AND period_id = p_period_id ORDER BY slot_index ASC);
END; $$;
