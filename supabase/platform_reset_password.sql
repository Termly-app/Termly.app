-- ============================================================
-- Platform Reset Password (Admin Utility)
-- Allows platform admins to reset passwords for school users
-- ============================================================

CREATE OR REPLACE FUNCTION public.platform_reset_password(
  target_user_id UUID,
  new_password TEXT
)
RETURNS JSONB AS $$
DECLARE
  is_admin BOOLEAN;
  result JSONB;
BEGIN
  -- 1. Security Check: Only platform admins can call this
  SELECT public.is_platform_admin() INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can reset passwords.';
  END IF;

  -- 2. Validate password length
  IF length(new_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters.';
  END IF;

  -- 3. Perform the reset (using the internal auth schema update)
  -- Note: In a real environment, you'd use the Supabase Auth Admin API
  -- Since we are in a direct SQL context, we update the auth.users table
  -- We rely on the fact that SECURITY DEFINER bypasses normal RLS
  
  UPDATE auth.users 
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found.';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Password updated successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
