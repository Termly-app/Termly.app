-- ============================================================
-- Timetable Module Tables
-- ============================================================

-- 1. Timetable Config (School Day Structure)
CREATE TABLE IF NOT EXISTS timetable_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES academic_periods(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL,
  label TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_break BOOLEAN DEFAULT false,
  UNIQUE(school_id, period_id, slot_index)
);

-- 2. Timetable Requirements (Lesson Goals)
CREATE TABLE IF NOT EXISTS timetable_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES academic_periods(id) ON DELETE CASCADE,
  class_grade TEXT NOT NULL,
  stream TEXT,
  subject TEXT NOT NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  periods_per_week INTEGER DEFAULT 1,
  allow_double BOOLEAN DEFAULT false,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, period_id, class_grade, stream, subject)
);

-- 3. Timetable Slots (Placed Lessons)
CREATE TABLE IF NOT EXISTS timetable_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES academic_periods(id) ON DELETE CASCADE,
  class_grade TEXT NOT NULL,
  stream TEXT,
  day_of_week TEXT NOT NULL,
  slot_index INTEGER NOT NULL,
  subject TEXT NOT NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  room TEXT,
  color TEXT,
  is_double_first BOOLEAN DEFAULT false,
  is_double_second BOOLEAN DEFAULT false,
  UNIQUE(school_id, period_id, class_grade, stream, day_of_week, slot_index)
);

-- 4. Subject Assignments (Linking Teachers to Subjects)
CREATE TABLE IF NOT EXISTS subject_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES academic_periods(id) ON DELETE CASCADE,
  class_grade TEXT NOT NULL,
  stream TEXT,
  subject TEXT NOT NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, period_id, class_grade, stream, subject)
);

-- Row Level Security (RLS)
ALTER TABLE timetable_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_assignments ENABLE ROW LEVEL SECURITY;

-- ... (previous policies remain) ...

-- Assignments RLS
DROP POLICY IF EXISTS "assignments_select" ON subject_assignments;
DROP POLICY IF EXISTS "assignments_modify" ON subject_assignments;
CREATE POLICY "assignments_select" ON subject_assignments FOR SELECT USING (
  school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid())
  OR school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
);
CREATE POLICY "assignments_modify" ON subject_assignments FOR ALL USING (
  school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
  OR school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid() AND role = 'Admin')
);

-- Config RLS
DROP POLICY IF EXISTS "configs_select" ON timetable_configs;
DROP POLICY IF EXISTS "configs_modify" ON timetable_configs;
CREATE POLICY "configs_select" ON timetable_configs FOR SELECT USING (
  school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid())
  OR school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
);
CREATE POLICY "configs_modify" ON timetable_configs FOR ALL USING (
  school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
  OR school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid() AND role = 'Admin')
);

-- Requirements RLS
DROP POLICY IF EXISTS "reqs_select" ON timetable_requirements;
DROP POLICY IF EXISTS "reqs_modify" ON timetable_requirements;
CREATE POLICY "reqs_select" ON timetable_requirements FOR SELECT USING (
  school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid())
  OR school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
);
CREATE POLICY "reqs_modify" ON timetable_requirements FOR ALL USING (
  school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
  OR school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid() AND role = 'Admin')
);

-- Slots RLS
DROP POLICY IF EXISTS "slots_select" ON timetable_slots;
DROP POLICY IF EXISTS "slots_modify" ON timetable_slots;
CREATE POLICY "slots_select" ON timetable_slots FOR SELECT USING (
  school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid())
  OR school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
);
CREATE POLICY "slots_modify" ON timetable_slots FOR ALL USING (
  school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
  OR school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid() AND role = 'Admin')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tt_configs_period ON timetable_configs(school_id, period_id);
CREATE INDEX IF NOT EXISTS idx_tt_reqs_class ON timetable_requirements(school_id, period_id, class_grade);
CREATE INDEX IF NOT EXISTS idx_tt_slots_class ON timetable_slots(school_id, period_id, class_grade, day_of_week);
CREATE INDEX IF NOT EXISTS idx_tt_slots_teacher ON timetable_slots(school_id, period_id, teacher_id, day_of_week);
