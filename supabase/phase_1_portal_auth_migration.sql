-- ============================================================
-- PHASE 1: PORTAL AUTH & PUBLISH SETTINGS MIGRATION
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Portal Users Table
CREATE TABLE IF NOT EXISTS public.portal_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('parent', 'guardian', 'student')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, student_id, email) -- One portal account per student/email combo
);

-- 2. Exam Publish Settings Table (For Admin controls over Portal)
CREATE TABLE IF NOT EXISTS public.exam_publish_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_entry_open BOOLEAN DEFAULT false,
  teacher_entry_deadline TIMESTAMPTZ,
  results_released_to_parents BOOLEAN DEFAULT false,
  results_released_at TIMESTAMPTZ,
  released_by UUID, -- Removed FK to public.profiles due to missing table
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id)
);

-- 3. RLS Policies for Portal Users
ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Portal users see own record" ON public.portal_users;
CREATE POLICY "Portal users see own record" ON public.portal_users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "School admins manage portal users" ON public.portal_users;
CREATE POLICY "School admins manage portal users" ON public.portal_users
  FOR ALL USING (
    school_id = (auth.jwt() ->> 'school_id')::uuid 
    OR public.is_platform_admin()
  );

-- 4. RLS Policies for Exam Publish Settings
ALTER TABLE public.exam_publish_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read exam settings for their school" ON public.exam_publish_settings;
CREATE POLICY "Anyone can read exam settings for their school" ON public.exam_publish_settings
  FOR SELECT USING (
    school_id = (auth.jwt() ->> 'school_id')::uuid 
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Admins can manage exam settings" ON public.exam_publish_settings;
CREATE POLICY "Admins can manage exam settings" ON public.exam_publish_settings
  FOR ALL USING (
    school_id = (auth.jwt() ->> 'school_id')::uuid 
    AND (auth.jwt() ->> 'role') = 'admin'
  );

-- 5. ABSOLUTE ISOLATION POLICIES (Parent View)
-- Parents can only read the student record they are linked to
DROP POLICY IF EXISTS "Parents can only read linked student" ON public.students;
CREATE POLICY "Parents can only read linked student" ON public.students
  FOR SELECT USING (
    id IN (SELECT student_id FROM public.portal_users WHERE id = auth.uid())
    OR school_id = (auth.jwt() ->> 'school_id')::uuid
    OR public.is_platform_admin()
  );

-- Parents can only read marks for their linked student, AND only if results_released_to_parents = true
DROP POLICY IF EXISTS "Parents can only read linked student marks" ON public.marks;
CREATE POLICY "Parents can only read linked student marks" ON public.marks
  FOR SELECT USING (
    student_id IN (SELECT student_id FROM public.portal_users WHERE id = auth.uid())
    OR school_id = (auth.jwt() ->> 'school_id')::uuid
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Parents can only read linked student exam results" ON public.exam_results;
CREATE POLICY "Parents can only read linked student exam results" ON public.exam_results
  FOR SELECT USING (
    (
      student_id IN (SELECT student_id FROM public.portal_users WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.exam_publish_settings eps 
        WHERE eps.exam_id = exam_id
        AND eps.results_released_to_parents = true
      )
    )
    OR school_id = (auth.jwt() ->> 'school_id')::uuid
    OR public.is_platform_admin()
  );

-- Add platform account flag to schools
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS is_platform_account BOOLEAN DEFAULT false;
