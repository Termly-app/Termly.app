-- ============================================================
-- 011_TEACHER_PORTAL_STABILIZATION.SQL
-- Robust RPCs for Teacher Portal and Exam Management
-- Fixes column mismatches and missing table errors
-- ============================================================

-- ─── 1. Fix Academic Periods RPC ────────────────────────────
-- Resolves "year must appear in GROUP BY" by using a subquery for ordering
CREATE OR REPLACE FUNCTION public.portal_get_periods(p_school_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
    FROM (
      SELECT id, year, term, is_active, school_id 
      FROM public.academic_periods 
      WHERE school_id = p_school_id 
      ORDER BY year DESC, term DESC
    ) t
  );
END; $$;

-- ─── 2. Fix School Profile RPC ──────────────────────────────
-- Matches actual school_profiles schema (school_name, etc.)
CREATE OR REPLACE FUNCTION public.portal_get_school_profile(p_school_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'id', id,
      'school_id', school_id,
      'name', school_name,
      'logo', logo,
      'motto', motto,
      'phone', phone,
      'email', email,
      'address', address,
      'subscription_plan', subscription_plan,
      'subscription_status', subscription_status,
      'grading_systems', grading_systems,
      'custom_exams', custom_exams
    )
    FROM public.school_profiles 
    WHERE school_id = p_school_id
    LIMIT 1
  );
END; $$;

-- ─── 3. Fix Exams RPCs ─────────────────────────────────────
-- Ensure the exams table exists defensively
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exam_type TEXT NOT NULL DEFAULT 'endterm',
  term TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'setup',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store.js expects 'portal_get_open_exams'
CREATE OR REPLACE FUNCTION public.portal_get_open_exams(p_school_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
    FROM (
      SELECT id, name, term, exam_type, status, created_at
      FROM public.exams 
      WHERE school_id = p_school_id AND status != 'closed'
      ORDER BY created_at DESC
    ) t
  );
END; $$;

-- ─── 4. Teacher Workload & Papers ──────────────────────────
-- Get exam papers assigned to a teacher
CREATE OR REPLACE FUNCTION public.portal_get_exam_papers(p_exam_id UUID, p_teacher_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
    FROM (
      SELECT 
        ep.id, ep.exam_id, ep.class_id, ep.subject_id, ep.max_score, ep.out_of,
        jsonb_build_object('name', c.name, 'stream', c.stream) as classes,
        jsonb_build_object('name', s.name) as tt_subjects
      FROM public.exam_papers ep
      JOIN public.classes c ON c.id = ep.class_id
      JOIN public.tt_subjects s ON s.id = ep.subject_id
      WHERE ep.exam_id = p_exam_id AND ep.teacher_id = p_teacher_id
    ) t
  );
END; $$;

-- Get teacher workload summary (number of lessons)
CREATE OR REPLACE FUNCTION public.portal_get_teacher_workload(p_school_id UUID, p_period_id UUID, p_teacher_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.tt_slots
  WHERE school_id = p_school_id AND period_id = p_period_id AND teacher_id = p_teacher_id;
  RETURN COALESCE(v_count, 0);
END; $$;

-- Get teacher weekly timetable
CREATE OR REPLACE FUNCTION public.portal_get_teacher_timetable(p_school_id UUID, p_period_id UUID, p_teacher_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
    FROM (
      SELECT 
        ts.id, ts.day_of_week, ts.slot_index,
        s.name as subject,
        c.name as class_grade,
        c.stream
      FROM public.tt_slots ts
      JOIN public.tt_subjects s ON s.id = ts.subject_id
      JOIN public.classes c ON c.id = ts.class_id
      WHERE ts.school_id = p_school_id AND ts.period_id = p_period_id AND ts.teacher_id = p_teacher_id
      ORDER BY ts.slot_index ASC
    ) t
  );
END; $$;

-- Get timetable configuration (time slots)
CREATE OR REPLACE FUNCTION public.portal_get_timetable_config(p_school_id UUID, p_period_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
    FROM (
      SELECT id, slot_index, start_time, end_time, is_break, label
      FROM public.timetable_slots
      WHERE school_id = p_school_id AND period_id = p_period_id
      ORDER BY slot_index ASC
    ) t
  );
END; $$;
