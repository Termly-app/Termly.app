-- Add grade_fees column to school_profiles
ALTER TABLE school_profiles ADD COLUMN IF NOT EXISTS grade_fees JSONB DEFAULT '{}';

-- Migration to ensure existing fees have school_id (already in schema but good to be certain)
-- No changes needed to fees table itself as it uses NUMERIC for total_fee which is flexible.
