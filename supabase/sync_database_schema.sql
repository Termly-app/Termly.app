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

-- 4. LMS (Assignments & Submissions) Sync
-- Create tables to support Moodle-inspired assignment hub
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES school_profiles(id),
    teacher_id UUID REFERENCES teachers(id),
    title TEXT NOT NULL,
    description TEXT,
    class TEXT NOT NULL,
    stream TEXT,
    subject TEXT NOT NULL,
    allow_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE,
    cutoff_date TIMESTAMP WITH TIME ZONE,
    links TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    student_name TEXT,
    payload TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    workflow_status TEXT DEFAULT 'Submitted',
    grade TEXT,
    feedback TEXT,
    synced_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for new tables (Basic policy - assuming user identification logic elsewhere)
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
