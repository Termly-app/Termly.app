-- 1. SCHOOL PROFILES Sync
-- Add missing columns to support custom exams and scaling
ALTER TABLE school_profiles ADD COLUMN IF NOT EXISTS custom_exams TEXT[] DEFAULT '{}';
ALTER TABLE school_profiles ADD COLUMN IF NOT EXISTS grading_systems JSONB DEFAULT '{"default": [{"min": 80, "max": 100, "grade": "A", "color": "#22c55e"}, {"min": 70, "max": 79, "grade": "B", "color": "#3b82f6"}, {"min": 60, "max": 69, "grade": "C", "color": "#eab308"}, {"min": 50, "max": 59, "grade": "D", "color": "#f97316"}, {"min": 0, "max": 49, "grade": "E", "color": "#ef4444"}]}';

-- 2. TEACHERS Table Sync
-- Add columns identified from 400 errors
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS subjects JSONB DEFAULT '[]';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS on_leave BOOLEAN DEFAULT false;

-- Following Zeraki Pattern: Enforce uniqueness on Phone Number
-- First, clean any orphans or duplicate numbers before adding constraint (optional, but safer)
-- ALTER TABLE teachers ADD CONSTRAINT teachers_phone_key UNIQUE (phone); 

-- 3. MARKS Table Sync
-- Add exam_type to enable CAT vs Exam isolation
ALTER TABLE marks ADD COLUMN IF NOT EXISTS exam_type TEXT DEFAULT 'End Term';

-- MIGRATION: Update all existing marks to 'End Term' type so they don't disappear
UPDATE marks SET exam_type = 'End Term' WHERE exam_type IS NULL;

-- Update Unique Constraint for marks to include exam_type
ALTER TABLE marks DROP CONSTRAINT IF EXISTS marks_exam_unique;
ALTER TABLE marks DROP CONSTRAINT IF EXISTS marks_period_unique;
ALTER TABLE marks DROP CONSTRAINT IF EXISTS marks_school_id_student_id_subject_key;
ALTER TABLE marks ADD CONSTRAINT marks_exam_unique UNIQUE(school_id, student_id, subject, period_id, exam_type);
