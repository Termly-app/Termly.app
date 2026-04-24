-- ============================================================
-- DOMAIN 12A: PORTAL AUTH REBUILD (SUPABASE AUTH INTEGRATION)
-- Run this in Supabase SQL Editor
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

-- 2. Portal RLS Policies
ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;

-- Portal Users read own row
DROP POLICY IF EXISTS "Portal users see own record" ON public.portal_users;
CREATE POLICY "Portal users see own record" ON public.portal_users
  FOR SELECT USING (auth.uid() = id);

-- School Admins manage portal users for their school
DROP POLICY IF EXISTS "School admins manage portal users" ON public.portal_users;
CREATE POLICY "School admins manage portal users" ON public.portal_users
  FOR ALL USING (
    school_id = (auth.jwt() ->> 'school_id')::uuid 
    OR public.is_platform_admin()
  );

-- 3. ABSOLUTE ISOLATION POLICIES (Parent View)
-- Parents can only read the student record they are linked to
DROP POLICY IF EXISTS "Parents can only read linked student" ON public.students;
CREATE POLICY "Parents can only read linked student" ON public.students
  FOR SELECT USING (
    id IN (SELECT student_id FROM public.portal_users WHERE id = auth.uid())
    OR school_id = (auth.jwt() ->> 'school_id')::uuid
    OR public.is_platform_admin()
  );

-- Parents can only read marks for their linked student
DROP POLICY IF EXISTS "Parents can only read linked student marks" ON public.marks;
CREATE POLICY "Parents can only read linked student marks" ON public.marks
  FOR SELECT USING (
    student_id IN (SELECT student_id FROM public.portal_users WHERE id = auth.uid())
    OR school_id = (auth.jwt() ->> 'school_id')::uuid
    OR public.is_platform_admin()
  );

-- Parents can only read fees for their linked student
DROP POLICY IF EXISTS "Parents can only read linked student fees" ON public.fees;
CREATE POLICY "Parents can only read linked student fees" ON public.fees
  FOR SELECT USING (
    student_id IN (SELECT student_id FROM public.portal_users WHERE id = auth.uid())
    OR school_id = (auth.jwt() ->> 'school_id')::uuid
    OR public.is_platform_admin()
  );
