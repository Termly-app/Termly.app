-- ============================================================
-- 003_TIMETABLE.SQL — Complete Timetabling Module Schema
-- Replaces the simpler timetable_schema.sql with full
-- constraint engine support, availability, targets.
-- ============================================================

-- ─── 1. TIMETABLE PERIODS (school day structure) ─────────────
CREATE TABLE IF NOT EXISTS public.tt_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'lesson',
    -- lesson, short_break, long_break, assembly, games, lunch, other
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INT NOT NULL,
  day_scope TEXT NOT NULL DEFAULT 'all_days', -- all_days, custom
  applies_to_days JSONB,  -- e.g. [1,2,3,4,5] for Mon-Fri
  order_index INT NOT NULL,
  can_be_double BOOLEAN DEFAULT FALSE,
  is_teachable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_ttp_school ON public.tt_periods(school_id, order_index);

-- ─── 2. TIMETABLE SUBJECTS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tt_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_code VARCHAR(10),
  subject_type TEXT NOT NULL DEFAULT 'core',
    -- core, elective, practical, activity
  curriculum_type TEXT NOT NULL DEFAULT 'both',
    -- cbc, 844, both
  allows_double BOOLEAN DEFAULT FALSE,
  color_hex VARCHAR(7) DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tts_school ON public.tt_subjects(school_id);

-- ─── 3. TEACHER-SUBJECT ASSIGNMENTS ──────────────────────────
CREATE TABLE IF NOT EXISTS public.tt_teacher_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.tt_subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_ttts_teacher ON public.tt_teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ttts_class ON public.tt_teacher_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_ttts_school ON public.tt_teacher_subjects(school_id);

-- ─── 4. TEACHER AVAILABILITY ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tt_teacher_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL, -- 1=Mon, 5=Fri
  period_id UUID NOT NULL REFERENCES public.tt_periods(id) ON DELETE CASCADE,
  is_available BOOLEAN DEFAULT TRUE,
  reason TEXT,
  UNIQUE(teacher_id, day_of_week, period_id)
);

CREATE INDEX IF NOT EXISTS idx_tta_teacher ON public.tt_teacher_availability(teacher_id);

-- ─── 5. TIMETABLE SLOTS (placed lessons) ─────────────────────
CREATE TABLE IF NOT EXISTS public.tt_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL, -- 1=Mon, 5=Fri
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

CREATE INDEX IF NOT EXISTS idx_ttsl_school ON public.tt_slots(school_id);
CREATE INDEX IF NOT EXISTS idx_ttsl_class ON public.tt_slots(class_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_ttsl_teacher ON public.tt_slots(teacher_id, day_of_week);

-- ─── 6. WEEKLY TARGETS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tt_weekly_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.tt_subjects(id) ON DELETE CASCADE,
  min_lessons INT NOT NULL DEFAULT 1,
  max_lessons INT NOT NULL DEFAULT 5,
  UNIQUE(class_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_ttwt_class ON public.tt_weekly_targets(class_id);

-- ─── 7. RLS ──────────────────────────────────────────────────
ALTER TABLE public.tt_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tt_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tt_teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tt_teacher_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tt_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tt_weekly_targets ENABLE ROW LEVEL SECURITY;

-- Periods
CREATE POLICY "ttp_select" ON public.tt_periods
  FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "ttp_modify" ON public.tt_periods
  FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

-- Subjects
CREATE POLICY "tts_select" ON public.tt_subjects
  FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "tts_modify" ON public.tt_subjects
  FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

-- Teacher Subjects
CREATE POLICY "ttts_select" ON public.tt_teacher_subjects
  FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "ttts_modify" ON public.tt_teacher_subjects
  FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

-- Teacher Availability
CREATE POLICY "tta_select" ON public.tt_teacher_availability
  FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "tta_modify" ON public.tt_teacher_availability
  FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

-- Slots — Teachers see only their own, admin sees all
CREATE POLICY "ttsl_select_admin" ON public.tt_slots
  FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "ttsl_modify" ON public.tt_slots
  FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

-- Weekly Targets
CREATE POLICY "ttwt_select" ON public.tt_weekly_targets
  FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "ttwt_modify" ON public.tt_weekly_targets
  FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));
