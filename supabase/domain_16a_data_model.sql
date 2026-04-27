-- ============================================================
-- DOMAIN 16A: ACADEMIC DATA MODEL (Streams, Assignments, Config)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Class Streams
CREATE TABLE IF NOT EXISTS public.class_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. 'Yellow', 'Blue'
  level TEXT NOT NULL, -- e.g. 'Form 1', 'Grade 4'
  academic_year INTEGER NOT NULL,
  capacity INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, level, name, academic_year)
);

-- 2. Update Students table to link to current stream
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES public.class_streams(id) ON DELETE SET NULL;

-- 3. Teacher Assignments
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  stream_id UUID NOT NULL REFERENCES public.class_streams(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  period_id UUID NOT NULL, -- Will link to periods table once created/standardized
  academic_year INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, teacher_id, stream_id, subject, period_id)
);

-- 4. Subject Configurations
CREATE TABLE IF NOT EXISTS public.subject_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  subjects TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, level)
);

-- 5. RLS Policies
ALTER TABLE public.class_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_configurations ENABLE ROW LEVEL SECURITY;

-- Apply Domain 1 Isolation Rules (JWT claims)
DROP POLICY IF EXISTS "School users access own class_streams" ON public.class_streams;
CREATE POLICY "School users access own class_streams" ON public.class_streams
  FOR ALL USING (
    school_id = (auth.jwt() ->> 'school_id')::uuid 
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "School users access own teacher_assignments" ON public.teacher_assignments;
CREATE POLICY "School users access own teacher_assignments" ON public.teacher_assignments
  FOR ALL USING (
    school_id = (auth.jwt() ->> 'school_id')::uuid 
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "School users access own subject_configurations" ON public.subject_configurations;
CREATE POLICY "School users access own subject_configurations" ON public.subject_configurations
  FOR ALL USING (
    school_id = (auth.jwt() ->> 'school_id')::uuid 
    OR public.is_platform_admin()
  );
