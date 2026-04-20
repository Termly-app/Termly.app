-- ============================================================
-- SQL Migration: Fix Timetable Constraints
-- Ensures the 'stream' column is NOT NULL to support reliable UPSERT (ON CONFLICT)
-- ============================================================

-- 1. Pre-sanitize: Convert all existing NULL streams to empty strings
UPDATE timetable_slots SET stream = '' WHERE stream IS NULL;
UPDATE timetable_requirements SET stream = '' WHERE stream IS NULL;
UPDATE subject_assignments SET stream = '' WHERE stream IS NULL;

-- 2. Modify columns to be NOT NULL with an empty string default
ALTER TABLE timetable_slots ALTER COLUMN stream SET DEFAULT '';
ALTER TABLE timetable_slots ALTER COLUMN stream SET NOT NULL;

ALTER TABLE timetable_requirements ALTER COLUMN stream SET DEFAULT '';
ALTER TABLE timetable_requirements ALTER COLUMN stream SET NOT NULL;

ALTER TABLE subject_assignments ALTER COLUMN stream SET DEFAULT '';
ALTER TABLE subject_assignments ALTER COLUMN stream SET NOT NULL;

-- 3. Ensure a clear UNIQUE INDEX exists for ON CONFLICT resolution
-- If an old unique constraint exists on these columns, we drop and recreate it cleanly
-- Note: In Supabase/Postgres, onConflict columns must match a UNIQUE index exactly.

DROP INDEX IF EXISTS idx_timetable_slots_unique_composite;
CREATE UNIQUE INDEX idx_timetable_slots_unique_composite 
ON timetable_slots (school_id, period_id, class_grade, stream, day_of_week, slot_index);
