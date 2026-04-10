-- ==============================================================================
-- DATABASE NORMALIZATION: Synchronizing with Super Admin Pricing
-- ==============================================================================
-- This script aligns existing school records with the new 'Sandbox' and 
-- 'Starter Plan' architecture established in the Super Admin panel.
-- ==============================================================================

-- 1. UPDATE COLUMN DEFAULTS
-- Ensure that any future registrations (even via SQL) default to 'Sandbox'
ALTER TABLE schools ALTER COLUMN plan SET DEFAULT 'Sandbox';
ALTER TABLE school_profiles ALTER COLUMN subscription_plan SET DEFAULT 'Sandbox';

-- 2. MIGRATE LEGACY 'BASIC' TO 'SANDBOX'
-- All schools previously on the non-existent 'Basic' plan are moved to 'Sandbox'
-- so they inherit the correct student/staff limits.
UPDATE schools 
SET plan = 'Sandbox' 
WHERE plan ILIKE 'Basic';

UPDATE school_profiles 
SET subscription_plan = 'Sandbox' 
WHERE subscription_plan ILIKE 'Basic';

-- 3. NORMALIZE PAID TIERS
-- Ensure that various spellings for the entry-level paid plan match the 
-- Super Admin's 'Starter Plan' key.
UPDATE schools 
SET plan = 'Starter Plan' 
WHERE plan ILIKE 'Starter' 
   OR plan ILIKE 'Starter Plan'
   OR plan ILIKE 'Fala';

UPDATE school_profiles 
SET subscription_plan = 'Starter Plan' 
WHERE subscription_plan ILIKE 'Starter' 
   OR subscription_plan ILIKE 'Starter Plan'
   OR subscription_plan ILIKE 'Fala';

-- 4. CLEANUP EXPIRED STATUSES
-- For Sandbox schools, ensure they have the long-term expiry date (2099)
-- so they are restricted by feature access, not by lockout.
UPDATE school_profiles
SET subscription_expiry = '2099-12-31 23:59:59+00',
    subscription_status = 'Active'
WHERE subscription_plan = 'Sandbox'
  AND (subscription_expiry IS NULL OR subscription_expiry < '2099-01-01');

-- 5. VERIFICATION LOG
-- (Supabase SQL Editor will show the row count for the above operations)
COMMENT ON TABLE schools IS 'Schools using Plan names synchronized with platform_settings.pricing keys.';
