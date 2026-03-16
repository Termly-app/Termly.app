-- Add exam_type column to marks table
ALTER TABLE marks ADD COLUMN IF NOT EXISTS exam_type TEXT DEFAULT 'End Term';

-- Update Unique Constraint to include exam_type
-- First, drop the old constraint if it exists (check various names it might have)
ALTER TABLE marks DROP CONSTRAINT IF EXISTS marks_exam_unique;
ALTER TABLE marks DROP CONSTRAINT IF EXISTS marks_period_unique;
ALTER TABLE marks DROP CONSTRAINT IF EXISTS marks_school_id_student_id_subject_key;

-- Add the new unique constraint including exam_type
ALTER TABLE marks ADD CONSTRAINT marks_exam_unique UNIQUE(school_id, student_id, subject, period_id, exam_type);
