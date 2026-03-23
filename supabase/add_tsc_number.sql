-- Add TSC Number column to teachers table
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS tsc_number VARCHAR(100);
