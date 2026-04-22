-- ============================================================
-- 012_PRODUCTION_READY_SCHEMA.SQL
-- Consolidated Master Schema Repair for ShuleSoft.
-- Ensures all tables, columns, and constraints are production-ready.
-- ============================================================

-- ─── 0. EXTENSIONS & SCHEMAS ───────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. TIMETABLE MODULE (Repairing 003) ───────────────────
CREATE TABLE IF NOT EXISTS public.tt_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'lesson',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INT NOT NULL,
  day_scope TEXT NOT NULL DEFAULT 'all_days',
  applies_to_days JSONB,
  order_index INT NOT NULL,
  can_be_double BOOLEAN DEFAULT FALSE,
  is_teachable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, order_index)
);

CREATE TABLE IF NOT EXISTS public.tt_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_code VARCHAR(10),
  subject_type TEXT NOT NULL DEFAULT 'core',
  curriculum_type TEXT NOT NULL DEFAULT 'both',
  allows_double BOOLEAN DEFAULT FALSE,
  color_hex VARCHAR(7) DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, name)
);

CREATE TABLE IF NOT EXISTS public.tt_teacher_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.tt_subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_id)
);

CREATE TABLE IF NOT EXISTS public.tt_teacher_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL,
  period_id UUID NOT NULL REFERENCES public.tt_periods(id) ON DELETE CASCADE,
  is_available BOOLEAN DEFAULT TRUE,
  reason TEXT,
  UNIQUE(teacher_id, day_of_week, period_id)
);

CREATE TABLE IF NOT EXISTS public.tt_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL,
  period_id UUID NOT NULL REFERENCES public.tt_periods(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.tt_subjects(id),
  teacher_id UUID REFERENCES public.users(id),
  is_double BOOLEAN DEFAULT FALSE,
  double_pair_id UUID REFERENCES public.tt_slots(id),
  is_locked BOOLEAN DEFAULT FALSE,
  term TEXT,
  academic_year TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, day_of_week, period_id, term)
);

CREATE TABLE IF NOT EXISTS public.tt_weekly_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.tt_subjects(id) ON DELETE CASCADE,
  min_lessons INT NOT NULL DEFAULT 1,
  max_lessons INT NOT NULL DEFAULT 5,
  UNIQUE(class_id, subject_id)
);

-- ─── 2. EXAMS MODULE (Repairing 005) ───────────────────────
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exam_type TEXT NOT NULL DEFAULT 'endterm',
  term TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'setup',
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exam_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id),
  class_id UUID NOT NULL REFERENCES public.classes(id),
  subject_id UUID NOT NULL REFERENCES public.tt_subjects(id),
  teacher_id UUID REFERENCES public.users(id),
  max_score DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  out_of DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  marks_entered INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, class_id, subject_id)
);

CREATE TABLE IF NOT EXISTS public.exam_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_paper_id UUID NOT NULL REFERENCES public.exam_papers(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  raw_score DECIMAL(5,2),
  converted_score DECIMAL(5,2),
  grade VARCHAR(5),
  points SMALLINT,
  is_absent BOOLEAN DEFAULT FALSE,
  remarks TEXT,
  entered_by UUID REFERENCES public.users(id),
  entered_at TIMESTAMPTZ,
  updated_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_paper_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  class_id UUID NOT NULL REFERENCES public.classes(id),
  total_marks DECIMAL(7,2) DEFAULT 0,
  total_subjects INT DEFAULT 0,
  mean_score DECIMAL(5,2) DEFAULT 0,
  mean_grade VARCHAR(5),
  mean_points DECIMAL(3,1),
  class_position INT,
  stream_position INT,
  class_size INT,
  stream_size INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  scale_type TEXT NOT NULL DEFAULT '844',
  grade VARCHAR(5) NOT NULL,
  min_score DECIMAL(5,2) NOT NULL,
  max_score DECIMAL(5,2) NOT NULL,
  points SMALLINT,
  description TEXT,
  UNIQUE(school_id, scale_type, grade)
);

-- ─── 3. COMMUNICATION MODULE (Repairing 006) ────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id),
  recipient_id UUID NOT NULL REFERENCES public.users(id),
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  reference_type TEXT,
  reference_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  in_app BOOLEAN DEFAULT TRUE,
  email BOOLEAN DEFAULT FALSE,
  sms BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, event_type)
);

-- ─── 4. CORE TABLE INTEGRITY ───────────────────────────────
-- Teachers Pin/Status support
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS pin TEXT DEFAULT '1234';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- Students Status support
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- Schools Public listing
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS publicly_listed BOOLEAN DEFAULT TRUE;

-- ─── 5. RE-APPLY CORRECTED RPCS ──────────────────────────────
-- These RPCs are critical for Teacher Portal functionality.
-- They bypass RLS (Security Definer) but are scoped by school_id.

-- DROP overloads to prevent signature mismatch errors
DROP FUNCTION IF EXISTS public.portal_get_teacher_assignments(uuid, uuid);
DROP FUNCTION IF EXISTS public.portal_get_teacher_assignments(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.portal_get_teacher_assignments(p_school_id UUID, p_period_id UUID, p_teacher_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'class_grade', class_grade, 'stream', stream, 'subject', subject
    )), '[]'::jsonb)
    FROM public.subject_assignments 
    WHERE school_id = p_school_id 
      AND period_id = p_period_id
      AND (
        teacher_id = p_teacher_id 
        OR teacher_id IN (SELECT user_id FROM teachers WHERE id = p_teacher_id)
        OR teacher_id IN (SELECT id FROM teachers WHERE user_id = p_teacher_id)
      )
  );
END; $$;

CREATE OR REPLACE FUNCTION public.portal_get_timetable_config(p_school_id UUID, p_period_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'slot_index', slot_index, 'start_time', start_time, 'end_time', end_time, 'name', name
    ) ORDER BY slot_index ASC), '[]'::jsonb)
    FROM public.timetable_configs WHERE school_id = p_school_id AND period_id = p_period_id
  );
END; $$;

CREATE OR REPLACE FUNCTION public.portal_get_teacher_workload(p_school_id UUID, p_period_id UUID, p_teacher_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.timetable_slots 
  WHERE school_id = p_school_id AND period_id = p_period_id 
    AND (
      teacher_id = p_teacher_id 
      OR teacher_id IN (SELECT user_id FROM teachers WHERE id = p_teacher_id)
      OR teacher_id IN (SELECT id FROM teachers WHERE user_id = p_teacher_id)
    );
  RETURN COALESCE(v_count, 0);
END; $$;

CREATE OR REPLACE FUNCTION public.portal_get_teacher_timetable(p_school_id UUID, p_period_id UUID, p_teacher_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (
    WITH unique_slots AS (
      SELECT DISTINCT ON (day_of_week, slot_index, subject, class_grade, stream)
        id, day_of_week, slot_index, subject, class_grade, stream, start_time, end_time
      FROM public.timetable_slots 
      WHERE school_id = p_school_id AND period_id = p_period_id 
        AND (
          teacher_id = p_teacher_id 
          OR teacher_id IN (SELECT user_id FROM teachers WHERE id = p_teacher_id)
          OR teacher_id IN (SELECT id FROM teachers WHERE user_id = p_teacher_id)
        )
      ORDER BY day_of_week, slot_index, subject, class_grade, stream, id
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'day_of_week', day_of_week, 'slot_index', slot_index, 'subject', subject, 
      'class_grade', class_grade, 'stream', stream, 'start_time', start_time, 'end_time', end_time
    ) ORDER BY slot_index ASC), '[]'::jsonb)
    FROM unique_slots
  );
END; $$;

CREATE OR REPLACE FUNCTION public.portal_get_open_exams(p_school_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'term', term, 'status', status
    )), '[]'::jsonb)
    FROM public.exams WHERE school_id = p_school_id AND status != 'Draft'
  );
END; $$;

CREATE OR REPLACE FUNCTION public.portal_get_school_profile(p_school_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(sp.*), '[]'::jsonb) 
    FROM public.school_profiles sp 
    WHERE school_id = p_school_id LIMIT 1
  );
END; $$;

-- ─── 6. ENABLE RLS ──────────────────────────────────────────
ALTER TABLE public.tt_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tt_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tt_teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tt_teacher_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tt_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tt_weekly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- ─── 7. POLICIES (Safe re-application) ───────────────────────
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "tts_select" ON public.tt_subjects;
    CREATE POLICY "tts_select" ON public.tt_subjects FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
    
    DROP POLICY IF EXISTS "tts_modify" ON public.tt_subjects;
    CREATE POLICY "tts_modify" ON public.tt_subjects FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

    DROP POLICY IF EXISTS "exams_select" ON public.exams;
    CREATE POLICY "exams_select" ON public.exams FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));

    DROP POLICY IF EXISTS "exams_modify" ON public.exams;
    CREATE POLICY "exams_modify" ON public.exams FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));
END $$;
