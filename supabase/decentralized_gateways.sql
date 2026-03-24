-- Add M-Pesa and SMS configuration columns to school_profiles
ALTER TABLE school_profiles
ADD COLUMN IF NOT EXISTS mpesa_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS sms_config JSONB DEFAULT '{}'::jsonb;

-- Comment for clarity
COMMENT ON COLUMN school_profiles.mpesa_config IS 'Stores school-specific Daraja API credentials (shortcode, consumer_key, consumer_secret)';
COMMENT ON COLUMN school_profiles.sms_config IS 'Stores school-specific Africa''s Talking credentials (sender_id, api_key)';
