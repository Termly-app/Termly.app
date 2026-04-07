-- PLG Scaling Phase Schema Updates

-- 1. Add staff_code to teachers table
-- Enforce uniqueness conceptually in application logic (active only)
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS staff_code TEXT;

-- 2. Add curriculum to school_profiles table
ALTER TABLE school_profiles ADD COLUMN IF NOT EXISTS curriculum TEXT DEFAULT 'CBC Only';
