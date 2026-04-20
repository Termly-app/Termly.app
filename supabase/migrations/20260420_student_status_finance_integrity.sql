-- Migration: Student Status and Fee Correction Logic
-- Run this in the Supabase SQL Editor to support archiving and payment voiding.

-- 1. Add status to students (Soft Delete Support)
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- 2. Add status and notes to fee_payments (Voiding Logic Support)
ALTER TABLE public.fee_payments 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Success';

ALTER TABLE public.fee_payments 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. (Optional) Audit logs for archiving events
-- Ensure activity_logs table exists if you want full auditing
CREATE TABLE IF NOT EXISTS public.platform_activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES public.schools(id),
    action TEXT NOT NULL,
    description TEXT,
    actor_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
