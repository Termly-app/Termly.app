-- Migration: Ensure critical setup and configuration columns exist in school_profiles
-- These columns are required for Setup Wizard stability and school type configuration

ALTER TABLE school_profiles 
ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS school_type TEXT DEFAULT 'Day',
ADD COLUMN IF NOT EXISTS boarding_houses JSONB DEFAULT '[]'::jsonb;

-- Update existing profiles to be marked as completed if they have active classes
-- This prevents the wizard from re-triggering for already set-up schools
UPDATE school_profiles 
SET setup_completed = TRUE 
WHERE setup_completed = FALSE 
AND active_classes IS NOT NULL 
AND jsonb_array_length(active_classes) > 0;

COMMENT ON COLUMN school_profiles.setup_completed IS 'Flag to track if the school has finished the initial setup wizard';
COMMENT ON COLUMN school_profiles.school_type IS 'Primary operation mode: Day, Boarding, or Mixed';
COMMENT ON COLUMN school_profiles.boarding_houses IS 'List of dormitory/hostel names for boarding schools';
