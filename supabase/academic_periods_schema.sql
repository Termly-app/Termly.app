-- 1. Create Academic Periods Table
CREATE TABLE IF NOT EXISTS academic_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  year TEXT NOT NULL, -- e.g., '2025'
  term TEXT NOT NULL, -- e.g., 'Term 1'
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, year, term)
);

-- 2. Add period_id to existing data tables
ALTER TABLE marks ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES academic_periods(id) ON DELETE CASCADE;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES academic_periods(id) ON DELETE CASCADE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES academic_periods(id) ON DELETE CASCADE;
ALTER TABLE cbc_assessments ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES academic_periods(id) ON DELETE CASCADE;
ALTER TABLE core_competencies ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES academic_periods(id) ON DELETE CASCADE;
ALTER TABLE subject_assignments ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES academic_periods(id) ON DELETE CASCADE;

-- 3. Update Unique Constraints to include period_id
-- Note: Some of these were defined in migration.sql. We need to DROP and RE-CREATE them.

-- Marks
ALTER TABLE marks DROP CONSTRAINT IF EXISTS marks_school_id_student_id_subject_key;
ALTER TABLE marks ADD CONSTRAINT marks_period_unique UNIQUE(school_id, student_id, subject, period_id);

-- Fees (Fees was student_id UNIQUE before, now it's per period)
ALTER TABLE fees DROP CONSTRAINT IF EXISTS fees_student_id_key;
ALTER TABLE fees ADD CONSTRAINT fees_period_unique UNIQUE(student_id, period_id);

-- Attendance (Was school_id, date, student_id)
-- Date + Student is usually enough but period_id adds extra safety
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_school_id_date_student_id_key;
ALTER TABLE attendance ADD CONSTRAINT attendance_period_unique UNIQUE(school_id, date, student_id, period_id);

-- CBC & Core Competencies
ALTER TABLE cbc_assessments DROP CONSTRAINT IF EXISTS cbc_assessments_school_id_student_id_subject_key;
ALTER TABLE cbc_assessments ADD CONSTRAINT cbc_period_unique UNIQUE(school_id, student_id, subject, period_id);

ALTER TABLE core_competencies DROP CONSTRAINT IF EXISTS core_competencies_school_id_student_id_competency_key;
ALTER TABLE core_competencies ADD CONSTRAINT core_period_unique UNIQUE(school_id, student_id, competency, period_id);

-- Subject Assignments
ALTER TABLE subject_assignments DROP CONSTRAINT IF EXISTS subject_assignments_school_id_class_grade_stream_subject_key;
ALTER TABLE subject_assignments ADD CONSTRAINT assignments_period_unique UNIQUE(school_id, class_grade, stream, subject, period_id);

-- 4. RLS for Academic Periods
ALTER TABLE academic_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "periods_select" ON academic_periods
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid())
    OR school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
  );

CREATE POLICY "periods_modify" ON academic_periods
  FOR ALL USING (
    school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
    OR school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid() AND role = 'Admin')
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marks_period ON marks(period_id);
CREATE INDEX IF NOT EXISTS idx_fees_period ON fees(period_id);
CREATE INDEX IF NOT EXISTS idx_attendance_period ON attendance(period_id);
