-- ============================================================
-- SQL RPC to find school by name or user email (SECURE)
-- and RLS policies to allow lookup flow
-- Execute this script in the Supabase SQL Editor
-- ============================================================

-- 1. Create the RPC function
-- This function runs as SECURITY DEFINER (bypassing RLS)
-- but returns only safe public fields.
CREATE OR REPLACE FUNCTION public.find_school_lookup(q TEXT)
RETURNS TABLE (id UUID, name TEXT, email TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.email
  FROM public.schools s
  WHERE s.name ILIKE '%' || q || '%'
     OR s.email ILIKE q
  UNION
  SELECT s.id, s.name, s.email
  FROM public.users u
  JOIN public.schools s ON s.id = u.school_id
  WHERE u.email ILIKE q;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant access to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.find_school_lookup(TEXT) TO authenticated, anon;

-- 3. Add a public SELECT policy to the schools table
-- This allows anyone to select from schools (required for lookup)
-- Note: it doesn't allow editing or deleting.
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "schools_public_lookup" ON schools;
    CREATE POLICY "schools_public_lookup" ON schools
      FOR SELECT USING (true);
END $$;
