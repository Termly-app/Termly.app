-- ============================================================
-- ShuleSoft - Super Admin Activation & Deactivation Logic
-- Handles unified expiration for schools and their enabled modules
-- ============================================================

/**
 * RESTORE / ACTIVATE SCHOOL
 * Extends the school's subscription and all currently enabled features.
 * Usage: SELECT public.restore_school_v3('school-uuid-here', 4);
 */
CREATE OR REPLACE FUNCTION public.restore_school_v3(
    p_school_id UUID, 
    p_months_to_add INT DEFAULT 4
)
RETURNS VOID AS $$
DECLARE
    v_new_expiry TIMESTAMPTZ;
BEGIN
    -- 1. Security Check: Only platform admins
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only Platform Admins can restore schools.';
    END IF;

    -- 2. Calculate new expiry
    -- We take the LATER of (current expiry) or (now) and add months
    SELECT COALESCE(subscription_expiry, now()) INTO v_new_expiry
    FROM public.school_profiles
    WHERE school_id = p_school_id;

    IF v_new_expiry < now() THEN
        v_new_expiry := now();
    END IF;

    v_new_expiry := v_new_expiry + (p_months_to_add || ' months')::interval;

    -- 3. Update School Profile
    UPDATE public.school_profiles
    SET subscription_status = 'Active',
        subscription_expiry = v_new_expiry,
        updated_at = now()
    WHERE school_id = p_school_id;

    -- 4. Re-activate all features that were already enabled
    -- Modules that were never enabled (is_enabled = false) remain inactive
    UPDATE public.school_features
    SET expires_at = v_new_expiry,
        updated_at = now()
    WHERE school_id = p_school_id 
      AND is_enabled = true;

    -- 5. Log Activity
    INSERT INTO public.platform_activity (action, description, school_id)
    VALUES ('ACTIVATION', 'School activated and features extended to ' || v_new_expiry::text, p_school_id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


/**
 * DEACTIVATE SCHOOL
 * Locks the school and expires all features immediately.
 * Usage: SELECT public.deactivate_school_v3('school-uuid-here');
 */
CREATE OR REPLACE FUNCTION public.deactivate_school_v3(
    p_school_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_past_date TIMESTAMPTZ := now() - interval '1 day';
BEGIN
    -- 1. Security Check
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only Platform Admins can deactivate schools.';
    END IF;

    -- 2. Update Profile to Deactivated and Expired
    UPDATE public.school_profiles
    SET subscription_status = 'Deactivated',
        subscription_expiry = v_past_date,
        updated_at = now()
    WHERE school_id = p_school_id;

    -- 3. Expire all features immediately
    -- We don't touch is_enabled so that we know what to re-activate later
    UPDATE public.school_features
    SET expires_at = v_past_date,
        updated_at = now()
    WHERE school_id = p_school_id;

    -- 4. Log Activity
    INSERT INTO public.platform_activity (action, description, school_id)
    VALUES ('DEACTIVATION', 'School deactivated and all features locked.', p_school_id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reload PostgREST to expose new functions
NOTIFY pgrst, 'reload schema';
