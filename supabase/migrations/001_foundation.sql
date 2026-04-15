-- ============================================================
-- 001_FOUNDATION.SQL — Base Schema Extensions
-- Adds school_code, classes table, credential columns,
-- parent-student linking, and OTP support.
-- Run AFTER the original migration.sql
-- ============================================================

-- ─── 1. SCHOOLS TABLE EXTENSIONS ─────────────────────────────
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS school_code VARCHAR(30) UNIQUE;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS publicly_listed BOOLEAN DEFAULT TRUE;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS school_type TEXT DEFAULT 'secondary';

-- Auto-generate school_code from school name for existing schools
-- e.g. "Sunshine Secondary" → "sunshine-secondary"
UPDATE public.schools
SET school_code = LOWER(REGEXP_REPLACE(TRIM(name), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE school_code IS NULL;

-- ─── 2. CLASSES TABLE (normalized from TEXT fields) ──────────
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- e.g. "Grade 4", "Form 2"
  level TEXT,                      -- e.g. "Upper Primary", "Secondary"
  stream TEXT DEFAULT 'General',   -- e.g. "East", "West", "General"
  curriculum_type TEXT DEFAULT 'both', -- 'cbc', '844', 'both'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, name, stream)
);

CREATE INDEX IF NOT EXISTS idx_classes_school ON public.classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_name ON public.classes(school_id, name);

-- ─── 3. USERS TABLE EXTENSIONS (credential system) ──────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS login_username TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_changed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS staff_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS default_password_type TEXT DEFAULT 'phone';

-- Unique constraint: one phone per school
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_phone_school
  ON public.users(phone_number, school_id)
  WHERE phone_number IS NOT NULL AND phone_number != '';

-- Unique constraint: one login_username globally
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_login_username
  ON public.users(login_username)
  WHERE login_username IS NOT NULL AND login_username != '';

-- Unique constraint: one staff_number per school
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_staff_school
  ON public.users(staff_number, school_id)
  WHERE staff_number IS NOT NULL AND staff_number != '';

-- ─── 4. STUDENTS TABLE EXTENSIONS ────────────────────────────
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ─── 5. TEACHERS TABLE EXTENSIONS ────────────────────────────
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS staff_number TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS tsc_number TEXT DEFAULT '';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS subjects JSONB DEFAULT '[]';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id);
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ─── 6. PARENT-STUDENT LINKING TABLE ─────────────────────────
CREATE TABLE IF NOT EXISTS public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'parent',
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_ps_parent ON public.parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_ps_student ON public.parent_students(student_id);
CREATE INDEX IF NOT EXISTS idx_ps_school ON public.parent_students(school_id);

-- ─── 7. PASSWORD RESET OTP TABLE ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  attempts SMALLINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_user ON public.password_reset_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON public.password_reset_otps(expires_at);

-- ─── 8. SMS QUEUE TABLE ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sms_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'queued',  -- queued, sent, failed, no_gateway
  provider_ref TEXT,             -- Africa's Talking message ID
  error_message TEXT,
  event_type TEXT,               -- what triggered this SMS
  related_user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sms_status ON public.sms_queue(status);
CREATE INDEX IF NOT EXISTS idx_sms_school ON public.sms_queue(school_id);

-- ─── 9. ENABLE RLS ON NEW TABLES ─────────────────────────────
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_queue ENABLE ROW LEVEL SECURITY;

-- ─── 10. RLS POLICIES — CLASSES ──────────────────────────────
DROP POLICY IF EXISTS "classes_select" ON public.classes;
CREATE POLICY "classes_select" ON public.classes
  FOR SELECT USING (
    school_id = public.get_auth_school_id()
    OR public.is_school_owner(school_id)
  );

DROP POLICY IF EXISTS "classes_modify" ON public.classes;
CREATE POLICY "classes_modify" ON public.classes
  FOR ALL USING (
    public.is_school_owner(school_id)
    OR public.is_school_admin(school_id)
  );

-- ─── 11. RLS POLICIES — PARENT_STUDENTS ──────────────────────
DROP POLICY IF EXISTS "parent_students_select" ON public.parent_students;
CREATE POLICY "parent_students_select" ON public.parent_students
  FOR SELECT USING (
    school_id = public.get_auth_school_id()
    OR public.is_school_owner(school_id)
    OR parent_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "parent_students_modify" ON public.parent_students;
CREATE POLICY "parent_students_modify" ON public.parent_students
  FOR ALL USING (
    public.is_school_owner(school_id)
    OR public.is_school_admin(school_id)
  );

-- ─── 12. RLS POLICIES — PASSWORD RESET OTPs ─────────────────
-- Only the system (service_role) should access OTPs directly
-- Users access via Edge Functions
DROP POLICY IF EXISTS "otp_service_only" ON public.password_reset_otps;
CREATE POLICY "otp_service_only" ON public.password_reset_otps
  FOR ALL USING (false); -- Only service_role bypasses RLS

-- ─── 13. RLS POLICIES — SMS QUEUE ────────────────────────────
DROP POLICY IF EXISTS "sms_select" ON public.sms_queue;
CREATE POLICY "sms_select" ON public.sms_queue
  FOR SELECT USING (
    school_id = public.get_auth_school_id()
    OR public.is_school_owner(school_id)
  );

DROP POLICY IF EXISTS "sms_modify" ON public.sms_queue;
CREATE POLICY "sms_modify" ON public.sms_queue
  FOR ALL USING (
    public.is_school_owner(school_id)
    OR public.is_school_admin(school_id)
  );

-- ─── 14. PUBLIC SCHOOL SEARCH FUNCTION ───────────────────────
-- Used by homepage school directory (no auth required)
CREATE OR REPLACE FUNCTION public.search_public_schools(search_query TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  school_code VARCHAR(30),
  location TEXT,
  school_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.school_code, s.location, s.school_type
  FROM public.schools s
  WHERE s.publicly_listed = TRUE
    AND s.status = 'active'
    AND s.school_code IS NOT NULL
    AND (
      s.name ILIKE '%' || search_query || '%'
      OR s.school_code ILIKE '%' || search_query || '%'
      OR s.location ILIKE '%' || search_query || '%'
    )
  ORDER BY s.name
  LIMIT 8;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
