-- ============================================================
-- ACADEMIC UNIFICATION MIGRATION (V3)
-- Ensures all tables for Academics, Timetable, and Staff exist
-- ============================================================

-- 1. Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ACADEMIC PERIODS (The foundation for all term-based data)
CREATE TABLE IF NOT EXISTS public.academic_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  year TEXT NOT NULL, -- e.g., '2025'
  term TEXT NOT NULL, -- e.g., 'Term 1'
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, year, term)
);

-- 3. CLASS STREAMS (Student groups within a level)
CREATE TABLE IF NOT EXISTS public.class_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. 'Yellow', 'Blue'
  level TEXT NOT NULL, -- e.g. 'Grade 1', 'Form 4'
  academic_year INTEGER NOT NULL,
  capacity INTEGER DEFAULT 40,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, level, name, academic_year)
);

-- 4. TEACHER ASSIGNMENTS (Linking teachers to streams and subjects)
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  stream_id UUID NOT NULL REFERENCES public.class_streams(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  period_id UUID REFERENCES public.academic_periods(id) ON DELETE SET NULL,
  academic_year INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, teacher_id, stream_id, subject, period_id)
);

-- 5. TIMETABLE SCHEMA
CREATE TABLE IF NOT EXISTS public.timetable_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.academic_periods(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL,
  label TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_break BOOLEAN DEFAULT false,
  UNIQUE(school_id, period_id, slot_index)
);

CREATE TABLE IF NOT EXISTS public.timetable_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.academic_periods(id) ON DELETE CASCADE,
  class_grade TEXT NOT NULL,
  stream TEXT,
  day_of_week TEXT NOT NULL,
  slot_index INTEGER NOT NULL,
  subject TEXT NOT NULL,
  teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  color TEXT,
  is_double_first BOOLEAN DEFAULT false,
  is_double_second BOOLEAN DEFAULT false,
  UNIQUE(school_id, period_id, class_grade, stream, day_of_week, slot_index)
);

-- 6. RLS POLICIES (Unified Policy using direct school_id check)
-- This avoids JWT claim issues in environments where claims aren't fully synced.

DO $$
BEGIN
    -- RLS for academic_periods
    ALTER TABLE public.academic_periods ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "access_academic_periods" ON public.academic_periods;
    CREATE POLICY "access_academic_periods" ON public.academic_periods FOR ALL USING (
        school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid())
        OR school_id IN (SELECT id FROM public.schools WHERE owner_id = auth.uid())
    );

    -- RLS for class_streams
    ALTER TABLE public.class_streams ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "access_class_streams" ON public.class_streams;
    CREATE POLICY "access_class_streams" ON public.class_streams FOR ALL USING (
        school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid())
        OR school_id IN (SELECT id FROM public.schools WHERE owner_id = auth.uid())
    );

    -- RLS for teacher_assignments
    ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "access_teacher_assignments" ON public.teacher_assignments;
    CREATE POLICY "access_teacher_assignments" ON public.teacher_assignments FOR ALL USING (
        school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid())
        OR school_id IN (SELECT id FROM public.schools WHERE owner_id = auth.uid())
    );

    -- RLS for timetable
    ALTER TABLE public.timetable_configs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "access_timetable_configs" ON public.timetable_configs;
    CREATE POLICY "access_timetable_configs" ON public.timetable_configs FOR ALL USING (
        school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid())
        OR school_id IN (SELECT id FROM public.schools WHERE owner_id = auth.uid())
    );

    ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "access_timetable_slots" ON public.timetable_slots;
    CREATE POLICY "access_timetable_slots" ON public.timetable_slots FOR ALL USING (
        school_id IN (SELECT school_id FROM public.users WHERE auth_user_id = auth.uid())
        OR school_id IN (SELECT id FROM public.schools WHERE owner_id = auth.uid())
    );
END $$;

-- 7. NOTIFY POSTGREST
NOTIFY pgrst, 'reload schema';
