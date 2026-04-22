-- Add missing created_by columns to exams and marks tables
-- This resolves the "Could not find 'created_by' column" error

ALTER TABLE exams ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE marks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Optional: Update RLS if needed, but the columns are the primary requirement for now.
COMMENT ON COLUMN exams.created_by IS 'The user who created the exam record';
COMMENT ON COLUMN marks.created_by IS 'The user who entered/updated the marks';
