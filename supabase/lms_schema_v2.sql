-- LMS SCHEMA EXTENSION: Moodle-Style Details
-- Run this to enable advanced grading and submission controls

-- 1. Update Assignments Table
ALTER TABLE lms_assignments ADD COLUMN IF NOT EXISTS max_score INTEGER DEFAULT 100;
ALTER TABLE lms_assignments ADD COLUMN IF NOT EXISTS submission_type TEXT DEFAULT 'online_text'; -- online_text, file_upload, link
ALTER TABLE lms_assignments ADD COLUMN IF NOT EXISTS allow_from TIMESTAMP WITH TIME ZONE;
ALTER TABLE lms_assignments ADD COLUMN IF NOT EXISTS cutoff_date TIMESTAMP WITH TIME ZONE;

-- 2. Update Submissions Table
ALTER TABLE lms_submissions ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE lms_submissions ADD COLUMN IF NOT EXISTS grade_numeric NUMERIC;
ALTER TABLE lms_submissions ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'submitted'; -- submitted, in_grading, released
ALTER TABLE lms_submissions ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE;

-- 3. RLS Logic (already in v1, but ensuring it covers new columns)
COMMENT ON TABLE lms_assignments IS 'Store academic tasks with due and cutoff dates.';
COMMENT ON TABLE lms_submissions IS 'Store student work with grading and feedback workflow.';
