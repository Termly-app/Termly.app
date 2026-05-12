-- Migration: Grading & Portal Stabilization
-- Adds columns for curriculum-aware grading (4-point/8-point rubrics) 
-- and fixes portal access RLS issues.

-- 1. Update school_profiles schema
ALTER TABLE public.school_profiles 
ADD COLUMN IF NOT EXISTS grading_systems JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS grading_mode TEXT DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS rubric_descriptions JSONB DEFAULT '{"1": "Below Expectation", "2": "Approaching Expectation", "3": "Meeting Expectation", "4": "Exceeding Expectation"}'::jsonb,
ADD COLUMN IF NOT EXISTS timetable_label TEXT DEFAULT 'Regular Schedule';

-- 2. Fix portal_access_settings RLS
-- Ensure the table exists and has the correct columns
CREATE TABLE IF NOT EXISTS public.portal_access_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    parent_portal_enabled BOOLEAN DEFAULT TRUE,
    teacher_portal_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id)
);

-- Add missing columns for stabilization if they don't exist
ALTER TABLE public.portal_access_settings ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.portal_access_settings ADD COLUMN IF NOT EXISTS student_portal_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.portal_access_settings ADD COLUMN IF NOT EXISTS allow_teacher_grading BOOLEAN DEFAULT TRUE;
ALTER TABLE public.portal_access_settings ADD COLUMN IF NOT EXISTS allow_parent_payments BOOLEAN DEFAULT TRUE;

-- Fix RLS: use auth_user_id (correct column) and grant write access
ALTER TABLE public.portal_access_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portal_access_select" ON public.portal_access_settings;
CREATE POLICY "portal_access_select" ON public.portal_access_settings
FOR SELECT USING (
    school_id = (auth.jwt() ->> 'school_id')::uuid
    OR auth.uid() = auth_user_id
);

DROP POLICY IF EXISTS "portal_access_modify" ON public.portal_access_settings;
CREATE POLICY "portal_access_modify" ON public.portal_access_settings
FOR ALL USING (
    school_id = (auth.jwt() ->> 'school_id')::uuid
    OR auth.uid() = auth_user_id
);

-- 3. Update comments
COMMENT ON COLUMN school_profiles.grading_mode IS 'Either percentage (0-100) or rubric (1-4/1-8)';
COMMENT ON COLUMN school_profiles.rubric_descriptions IS 'Mapping of rubric points to descriptive levels';
