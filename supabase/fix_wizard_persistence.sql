-- ============================================================
-- FIX WIZARD PERSISTENCE
-- Run this in Supabase SQL Editor to add missing columns
-- required for the Setup Wizard to save state and fees.
-- ============================================================

-- 1. Add missing flags and configuration columns
ALTER TABLE public.school_profiles 
ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS grade_fees JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS boarding_houses JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS school_type TEXT DEFAULT 'Day';

-- 2. Ensure existing columns are robust (Optional, but safe)
-- ALTER TABLE public.school_profiles ALTER COLUMN streams_per_class SET DEFAULT '{}';
-- ALTER TABLE public.school_profiles ALTER COLUMN active_classes SET DEFAULT '[]';

-- 3. Sync existing data if any
UPDATE public.school_profiles SET setup_completed = FALSE WHERE setup_completed IS NULL;
UPDATE public.school_profiles SET grade_fees = '{}' WHERE grade_fees IS NULL;
UPDATE public.school_profiles SET boarding_houses = '[]' WHERE boarding_houses IS NULL;
UPDATE public.school_profiles SET school_type = 'Day' WHERE school_type IS NULL;

-- 4. LOG ACTIVITY
COMMENT ON COLUMN public.school_profiles.setup_completed IS 'Flag indicating if the initial setup wizard was finished.';
COMMENT ON COLUMN public.school_profiles.grade_fees IS 'JSON structure storing tuition and boarding fees per grade.';
