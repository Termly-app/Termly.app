-- RPC to allow a super admin to reset any user's password
-- This function runs with SECURITY DEFINER (root privileges) to bypass RLS
CREATE OR REPLACE FUNCTION platform_reset_password(target_user_id UUID, new_password TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the password in auth.users
  -- Note: pgcrypto must be enabled (usually it is by default in Supabase)
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;

-- Extend current lookup RLS or add more Super Admin utilities here if needed.
