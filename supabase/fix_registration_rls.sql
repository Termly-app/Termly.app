-- ============================================================
-- Secondary RLS Fix: Registration Policy Fix
-- Execute this script in the Supabase SQL Editor
-- ============================================================

-- The previous fix set schools_insert to:
-- FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- But in `registerSchool`, we explicitly pass `authUserId` as `owner_id`. We need to ensure
-- the inserted `owner_id` matches the authenticated user.

DROP POLICY IF EXISTS "schools_insert" ON schools;
CREATE POLICY "schools_insert" ON schools FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Also checking the `users` insert policy. During registration, the admin user is created
-- BEFORE they are technically "in" the school according to the DB, so `get_auth_school_id()`
-- or `is_school_owner()` might fail if they evaluate too strictly during the transaction.
-- If the inserting user is the owner of the school they are trying to insert into, allow it.

DROP POLICY IF EXISTS "users_insert" ON users;
CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (
    -- Allow if they are inserting themselves as the first admin during registration
    (auth_user_id = auth.uid()) OR
    -- Or if they are the owner of the target school
    public.is_school_owner(school_id) OR
    -- Or if they are an existing admin in the target school
    public.is_school_admin(school_id)
  );

-- And the `school_profiles` insert, same principle:
DROP POLICY IF EXISTS "school_profiles_insert" ON school_profiles;
CREATE POLICY "school_profiles_insert" ON school_profiles
  FOR INSERT WITH CHECK (
    -- Must be the owner of the target school
    school_id IN (SELECT id FROM schools WHERE owner_id = auth.uid())
  );
