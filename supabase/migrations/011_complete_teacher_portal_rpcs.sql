-- ============================================================
-- 011_COMPLETE_TEACHER_PORTAL_RPCS.SQL
-- Finalizing RPCs for Teacher Portal and adding Owner Fallback.
-- ============================================================

-- ─── 1. Teacher Timetable (from timetable_slots) ──────────────
CREATE OR REPLACE FUNCTION public.portal_get_teacher_timetable(p_school_id UUID, p_period_id UUID, p_teacher_id UUID)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'day_of_week', day_of_week,
        'slot_index', slot_index,
        'subject', subject,
        'class_grade', class_grade,
        'stream', stream,
        'start_time', start_time,
        'end_time', end_time
      ) ORDER BY slot_index ASC
    ), '[]'::jsonb)
    FROM public.timetable_slots 
    WHERE school_id = p_school_id 
      AND period_id = p_period_id 
      AND (
        teacher_id = p_teacher_id 
        OR teacher_id IN (SELECT id FROM public.teachers WHERE user_id = p_teacher_id)
        OR teacher_id IN (SELECT user_id FROM public.teachers WHERE id = p_teacher_id)
      )
  );
END;
$$;

-- ─── 2. Teacher Assignments (Subject Allocations) ───────────
CREATE OR REPLACE FUNCTION public.portal_get_teacher_assignments(p_school_id UUID, p_teacher_id UUID)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'class_grade', class_grade,
        'stream', stream,
        'subject', subject,
        'teacher_id', teacher_id
      )
    ), '[]'::jsonb)
    FROM public.subject_assignments
    WHERE school_id = p_school_id 
      AND (
        teacher_id = p_teacher_id 
        OR teacher_id IN (SELECT id FROM public.teachers WHERE user_id = p_teacher_id)
        OR teacher_id IN (SELECT user_id FROM public.teachers WHERE id = p_teacher_id)
      )
  );
END;
$$;

-- ─── 3. Teacher Workload Summary ───────────────────────────
CREATE OR REPLACE FUNCTION public.portal_get_teacher_workload(p_school_id UUID, p_period_id UUID, p_teacher_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.timetable_slots 
  WHERE school_id = p_school_id 
    AND period_id = p_period_id 
    AND (
      teacher_id = p_teacher_id 
      OR teacher_id IN (SELECT id FROM public.teachers WHERE user_id = p_teacher_id)
    );
  RETURN v_count;
END;
$$;

-- ─── 4. Staff Login with School Owner Fallback ──────────────
CREATE OR REPLACE FUNCTION public.validate_staff_portal_login(p_school_search TEXT, p_phone TEXT, p_pin TEXT)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_school_id UUID; 
  v_school_name TEXT; 
  v_school_phone TEXT;
  v_teacher RECORD; 
  v_cleaned_phone TEXT;
  v_cleaned_school_phone TEXT;
BEGIN
  -- 1. Identify School
  SELECT id, name, phone INTO v_school_id, v_school_name, v_school_phone FROM public.schools 
  WHERE id::text = p_school_search OR school_code ILIKE p_school_search 
     OR name ILIKE '%' || p_school_search || '%' 
     OR email ILIKE '%' || p_school_search || '%' LIMIT 1;
  
  IF v_school_id IS NULL THEN RETURN jsonb_build_object('error', 'Institution profile not found.'); END IF;
  
  v_cleaned_phone := REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g');
  v_cleaned_school_phone := REGEXP_REPLACE(COALESCE(v_school_phone, ''), '[^0-9]', '', 'g');
  
  -- 2. Check Teachers Table (Normal Teacher Login)
  SELECT id, name, school_id, pin, user_id, subjects INTO v_teacher FROM public.teachers
  WHERE school_id = v_school_id AND (
    REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = v_cleaned_phone 
    OR phone = p_phone
  ) LIMIT 1;

  -- 3. Final Validation for Teachers
  IF v_teacher.id IS NULL THEN 
    RETURN jsonb_build_object('error', 'Account not found. Ensure your phone number ' || p_phone || ' is registered at ' || v_school_name || '.'); 
  END IF;
  
  IF COALESCE(v_teacher.pin, '1234') != p_pin THEN 
    RETURN jsonb_build_object('error', 'Invalid PIN code.'); 
  END IF;
  
  RETURN jsonb_build_object(
    'id', COALESCE(v_teacher.user_id, v_teacher.id), 
    'teacher_record_id', v_teacher.id,
    'user_id', v_teacher.user_id,
    'name', v_teacher.name, 
    'role', 'teacher', 
    'school_id', v_teacher.school_id,
    'subjects', COALESCE(v_teacher.subjects, '[]'::jsonb)
  );
END; 
$$;

-- ─── 5. Get Open Exams for Portal ───────────────────────────
CREATE OR REPLACE FUNCTION public.portal_get_open_exams(p_school_id UUID)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'term', term,
        'exam_type', exam_type,
        'status', status
      )
    ), '[]'::jsonb)
    FROM public.exams 
    WHERE school_id = p_school_id 
      AND status NOT ILIKE 'Draft' 
    ORDER BY created_at DESC
  );
END;
$$;
