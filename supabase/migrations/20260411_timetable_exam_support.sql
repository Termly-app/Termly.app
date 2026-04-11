-- SQL Migration: Add support for variable-duration manual exams
-- This adds the necessary columns to the timetable_slots table

ALTER TABLE timetable_slots 
ADD COLUMN IF NOT EXISTS "date" DATE,
ADD COLUMN IF NOT EXISTS "start_time" TIME,
ADD COLUMN IF NOT EXISTS "end_time" TIME;

-- Optional: Indexing for better search performance in large schools
CREATE INDEX IF NOT EXISTS idx_timetable_slots_date ON timetable_slots("date");
CREATE INDEX IF NOT EXISTS idx_timetable_slots_type ON timetable_slots("type");

COMMENT ON COLUMN timetable_slots.date IS 'Specific date for manual exam/CAT sessions';
COMMENT ON COLUMN timetable_slots.start_time IS 'Manual start time for irregular duration slots (Exams)';
COMMENT ON COLUMN timetable_slots.end_time IS 'Manual end time for irregular duration slots (Exams)';
