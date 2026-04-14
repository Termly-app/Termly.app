-- ============================================================
-- RLS Infinite Recursion Fix
-- Execute this script in the Supabase SQL Editor
-- ============================================================

-- 1. Create SECURITY DEFINER functions to bypass RLS during policy checks
CREATE OR REPLACE FUNCTION public.get_auth_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_school_admin(check_school_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'Admin' AND school_id = check_school_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_school_finance(check_school_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND (role = 'Admin' OR role = 'Finance') 
    AND school_id = check_school_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_school_librarian(check_school_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND (role = 'Admin' OR role = 'Librarian') 
    AND school_id = check_school_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_school_teacher(check_school_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND (role = 'Admin' OR role = 'Teacher') 
    AND school_id = check_school_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_school_owner(check_school_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.schools WHERE owner_id = auth.uid() AND id = check_school_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Drop existing problematic policies
DROP POLICY IF EXISTS "schools_owner_all" ON schools;
DROP POLICY IF EXISTS "schools_member_select" ON schools;
DROP POLICY IF EXISTS "schools_insert" ON schools;

DROP POLICY IF EXISTS "school_profiles_select" ON school_profiles;
DROP POLICY IF EXISTS "school_profiles_insert" ON school_profiles;
DROP POLICY IF EXISTS "school_profiles_update" ON school_profiles;

DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_delete" ON users;

DROP POLICY IF EXISTS "students_select" ON students;
DROP POLICY IF EXISTS "students_modify" ON students;

DROP POLICY IF EXISTS "teachers_select" ON teachers;
DROP POLICY IF EXISTS "teachers_modify" ON teachers;

DROP POLICY IF EXISTS "marks_select" ON marks;
DROP POLICY IF EXISTS "marks_modify" ON marks;

DROP POLICY IF EXISTS "fees_select" ON fees;
DROP POLICY IF EXISTS "fees_modify" ON fees;

DROP POLICY IF EXISTS "fee_payments_select" ON fee_payments;
DROP POLICY IF EXISTS "fee_payments_modify" ON fee_payments;

DROP POLICY IF EXISTS "attendance_select" ON attendance;
DROP POLICY IF EXISTS "attendance_modify" ON attendance;

DROP POLICY IF EXISTS "cbc_assessments_select" ON cbc_assessments;
DROP POLICY IF EXISTS "cbc_assessments_modify" ON cbc_assessments;

DROP POLICY IF EXISTS "core_competencies_select" ON core_competencies;
DROP POLICY IF EXISTS "core_competencies_modify" ON core_competencies;

DROP POLICY IF EXISTS "subject_assignments_select" ON subject_assignments;
DROP POLICY IF EXISTS "subject_assignments_modify" ON subject_assignments;


-- 3. Recreate policies utilizing the security definer functions

-- Schools
CREATE POLICY "schools_owner_all" ON schools FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "schools_member_select" ON schools FOR SELECT USING (id = public.get_auth_school_id());
CREATE POLICY "schools_insert" ON schools FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- School Profiles
CREATE POLICY "school_profiles_select" ON school_profiles
  FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "school_profiles_insert" ON school_profiles
  FOR INSERT WITH CHECK (public.is_school_owner(school_id));
CREATE POLICY "school_profiles_update" ON school_profiles
  FOR UPDATE USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

-- Users
CREATE POLICY "users_select" ON users
  FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (public.is_school_owner(school_id) OR public.is_school_admin(school_id) OR auth.uid() IS NOT NULL);
CREATE POLICY "users_update" ON users
  FOR UPDATE USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));
CREATE POLICY "users_delete" ON users
  FOR DELETE USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

-- Students
CREATE POLICY "students_select" ON students FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "students_modify" ON students FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

-- Teachers
CREATE POLICY "teachers_select" ON teachers FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "teachers_modify" ON teachers FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

-- Marks (Teachers and Admins can modify)
CREATE POLICY "marks_select" ON marks FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "marks_modify" ON marks FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_teacher(school_id));

-- Fees (Finance and Admins can modify)
CREATE POLICY "fees_select" ON fees FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "fees_modify" ON fees FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_finance(school_id));

-- Fee Payments
CREATE POLICY "fee_payments_select" ON fee_payments FOR SELECT USING (
  fee_id IN (SELECT id FROM fees WHERE school_id = public.get_auth_school_id() OR public.is_school_owner(school_id))
);
CREATE POLICY "fee_payments_modify" ON fee_payments FOR ALL USING (
  fee_id IN (SELECT id FROM fees WHERE public.is_school_owner(school_id) OR public.is_school_finance(school_id))
);

-- Attendance (Teachers and Admins can modify)
CREATE POLICY "attendance_select" ON attendance FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "attendance_modify" ON attendance FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_teacher(school_id));

-- CBC
CREATE POLICY "cbc_assessments_select" ON cbc_assessments FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "cbc_assessments_modify" ON cbc_assessments FOR ALL USING (public.is_school_owner(school_id) OR school_id = public.get_auth_school_id());

-- Core Competencies
CREATE POLICY "core_competencies_select" ON core_competencies FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "core_competencies_modify" ON core_competencies FOR ALL USING (public.is_school_owner(school_id) OR school_id = public.get_auth_school_id());

-- Subjects
CREATE POLICY "subject_assignments_select" ON subject_assignments FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "subject_assignments_modify" ON subject_assignments FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));
