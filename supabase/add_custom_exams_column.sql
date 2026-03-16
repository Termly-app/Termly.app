-- Add custom_exams column to school_profiles to resolve missing column error
ALTER TABLE school_profiles ADD COLUMN IF NOT EXISTS custom_exams JSONB DEFAULT '["CAT 1", "CAT 2", "Mid Term", "End Term"]';

-- Also ensure cleaning up any possible schema cache issues by adding comments or simple updates if needed
COMMENT ON COLUMN school_profiles.custom_exams IS 'Stores customized exam types for the school';
