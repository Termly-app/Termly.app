-- ============================================================
-- ShuleSoft Database Schema for Supabase
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. SCHOOLS (multi-tenant registry)
-- ============================================================
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'Sandbox',
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. SCHOOL PROFILES (configuration per school)
-- ============================================================
CREATE TABLE IF NOT EXISTS school_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
  school_name TEXT NOT NULL DEFAULT 'ShuleSoft Academy',
  motto TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  logo TEXT DEFAULT '',
  subscription_plan TEXT DEFAULT 'Sandbox',
  streams_per_class JSONB DEFAULT '{}',
  active_classes JSONB DEFAULT '[]',
  custom_subjects JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. USERS (staff users per school)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Teacher',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. STUDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  adm_no TEXT NOT NULL,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  stream TEXT DEFAULT 'General',
  parent TEXT DEFAULT '',
  parent_phone TEXT DEFAULT '',
  gender TEXT DEFAULT '',
  dob TEXT DEFAULT '',
  join_date TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. TEACHERS
-- ============================================================
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. MARKS
-- ============================================================
CREATE TABLE IF NOT EXISTS marks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  mark INTEGER DEFAULT 0,
  UNIQUE(school_id, student_id, subject)
);

-- ============================================================
-- 7. FEES
-- ============================================================
CREATE TABLE IF NOT EXISTS fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE UNIQUE,
  total_fee NUMERIC DEFAULT 15000,
  paid NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 15000
);

-- ============================================================
-- 8. FEE PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS fee_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fee_id UUID NOT NULL REFERENCES fees(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date TEXT NOT NULL,
  method TEXT DEFAULT 'Cash',
  reference TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'present',
  UNIQUE(school_id, date, student_id)
);

-- ============================================================
-- 10. CBC ASSESSMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS cbc_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'Meeting Expectation',
  UNIQUE(school_id, student_id, subject)
);

-- ============================================================
-- 11. CORE COMPETENCIES
-- ============================================================
CREATE TABLE IF NOT EXISTS core_competencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  competency TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'Meeting Expectation',
  UNIQUE(school_id, student_id, competency)
);

-- ============================================================
-- 12. SUBJECT ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS subject_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_grade TEXT NOT NULL,
  stream TEXT DEFAULT 'General',
  subject TEXT NOT NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  UNIQUE(school_id, class_grade, stream, subject)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbc_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_assignments ENABLE ROW LEVEL SECURITY;

-- Schools: Owner can do everything, any authenticated user can read their own school
CREATE POLICY "schools_owner_all" ON schools
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "schools_member_select" ON schools
  FOR SELECT USING (
    id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid())
  );

-- Allow authenticated users to insert schools (for registration)
CREATE POLICY "schools_insert" ON schools
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- School Profiles: Members of the school can read, owner/admin can update
CREATE POLICY "school_profiles_select" ON school_profiles
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid())
    OR school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
  );

CREATE POLICY "school_profiles_insert" ON school_profiles
  FOR INSERT WITH CHECK (
    school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
  );

CREATE POLICY "school_profiles_update" ON school_profiles
  FOR UPDATE USING (
    school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
    OR school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid() AND role = 'Admin')
  );

-- Generic policy helper: school members can SELECT, school admins/owner can do all
-- We'll apply this pattern to all data tables

-- Users table policies
CREATE POLICY "users_select" ON users
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM users u2 WHERE u2.auth_user_id = auth.uid())
    OR school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
  );

CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (
    school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
    OR school_id IN (SELECT school_id FROM users u2 WHERE u2.auth_user_id = auth.uid() AND u2.role = 'Admin')
    OR auth.uid() IS NOT NULL
  );

CREATE POLICY "users_update" ON users
  FOR UPDATE USING (
    school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
    OR school_id IN (SELECT school_id FROM users u2 WHERE u2.auth_user_id = auth.uid() AND u2.role = 'Admin')
  );

CREATE POLICY "users_delete" ON users
  FOR DELETE USING (
    school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
    OR school_id IN (SELECT school_id FROM users u2 WHERE u2.auth_user_id = auth.uid() AND u2.role = 'Admin')
  );

-- Students policies (school members can read, admins can write)
CREATE POLICY "students_select" ON students
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid())
    OR school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
  );

CREATE POLICY "students_modify" ON students
  FOR ALL USING (
    school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
    OR school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid() AND role = 'Admin')
  );

-- Teachers
CREATE POLICY "teachers_select" ON teachers
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid())
    OR school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
  );

CREATE POLICY "teachers_modify" ON teachers
  FOR ALL USING (
    school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
    OR school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid() AND role = 'Admin')
  );

-- Marks
CREATE POLICY "marks_select" ON marks
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid())
    OR school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
  );

CREATE POLICY "marks_modify" ON marks
  FOR ALL USING (
    school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
    OR school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid() AND (role = 'Admin' OR role = 'Teacher'))
  );

-- Fees
CREATE POLICY "fees_select" ON fees
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid())
    OR school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
  );

CREATE POLICY "fees_modify" ON fees
  FOR ALL USING (
    school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
    OR school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid() AND (role = 'Admin' OR role = 'Finance'))
  );

-- Fee Payments
CREATE POLICY "fee_payments_select" ON fee_payments
  FOR SELECT USING (
    fee_id IN (
      SELECT f.id FROM fees f
      JOIN users u ON u.school_id = f.school_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "fee_payments_modify" ON fee_payments
  FOR ALL USING (
    fee_id IN (
      SELECT f.id FROM fees f
      JOIN users u ON u.school_id = f.school_id
      WHERE u.auth_user_id = auth.uid() AND (u.role = 'Admin' OR u.role = 'Finance')
    )
    OR fee_id IN (
      SELECT f.id FROM fees f
      JOIN schools s ON s.id = f.school_id
      WHERE s.owner_id = auth.uid()
    )
  );

-- Attendance
CREATE POLICY "attendance_select" ON attendance
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid())
    OR school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
  );

CREATE POLICY "attendance_modify" ON attendance
  FOR ALL USING (
    school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
    OR school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid() AND (role = 'Admin' OR role = 'Teacher'))
  );

-- CBC Assessments
CREATE POLICY "cbc_assessments_select" ON cbc_assessments
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid())
    OR school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
  );

CREATE POLICY "cbc_assessments_modify" ON cbc_assessments
  FOR ALL USING (
    school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
    OR school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid() AND (role = 'Admin' OR role = 'Teacher'))
  );

-- Core Competencies
CREATE POLICY "core_competencies_select" ON core_competencies
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid())
    OR school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
  );

CREATE POLICY "core_competencies_modify" ON core_competencies
  FOR ALL USING (
    school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
    OR school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid() AND (role = 'Admin' OR role = 'Teacher'))
  );

-- Subject Assignments
CREATE POLICY "subject_assignments_select" ON subject_assignments
  FOR SELECT USING (
    school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid())
    OR school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
  );

CREATE POLICY "subject_assignments_modify" ON subject_assignments
  FOR ALL USING (
    school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
    OR school_id IN (SELECT school_id FROM users WHERE auth_user_id = auth.uid() AND role = 'Admin')
  );

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(school_id, class);
CREATE INDEX IF NOT EXISTS idx_teachers_school ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_marks_student ON marks(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_fees_student ON fees(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(school_id, date);
CREATE INDEX IF NOT EXISTS idx_cbc_student ON cbc_assessments(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_cc_student ON core_competencies(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON subject_assignments(school_id, class_grade);
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_auth ON users(auth_user_id);
