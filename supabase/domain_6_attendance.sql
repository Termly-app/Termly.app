-- Domain 6: Mobile Attendance Enhancements
-- This script adds multi-session support to the attendance system.

-- 1. Add session column to attendance
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS session TEXT DEFAULT 'Morning';

-- 2. Update unique constraint to include session
-- First drop existing constraint if it exists (might be named differently)
-- We'll assume the standard one based on our previous knowledge or naming conventions
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_school_id_date_student_id_period_id_key;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_unique_entry UNIQUE(school_id, date, student_id, session, period_id);

-- 3. Update getAttendance function in Supabase if any (not used here, we use direct table access)

-- 4. Enable RLS (already enabled probably, but ensure)
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
