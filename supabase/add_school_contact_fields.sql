-- ============================================================
-- ADD SCHOOL CONTACT FIELDS
-- Run this in your Supabase SQL Editor to add phone and location
-- to the main schools table for easier admin access.
-- ============================================================

-- 1. Add columns to schools table
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- 2. Optional: Migration of existing data
-- This assumes school_profiles already has some data
-- UPDATE public.schools s
-- SET 
--   phone = p.phone,
--   location = p.address
-- FROM public.school_profiles p
-- WHERE s.id = p.school_id;
