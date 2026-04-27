-- Add status_notes to school_profiles to store deactivation/activation details
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_profiles' AND column_name = 'status_notes') THEN
        ALTER TABLE public.school_profiles ADD COLUMN status_notes TEXT;
    END IF;
END $$;

-- Update deactivate function to accept notes
CREATE OR REPLACE FUNCTION public.deactivate_school_v4(
    p_school_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_past_date TIMESTAMPTZ := now() - interval '1 day';
BEGIN
    -- Security check
    IF NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE public.school_profiles
    SET subscription_status = 'Deactivated',
        subscription_expiry = v_past_date,
        status_notes = p_notes,
        updated_at = now()
    WHERE school_id = p_school_id;

    UPDATE public.school_features
    SET expires_at = v_past_date,
        updated_at = now()
    WHERE school_id = p_school_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update restore function to accept notes
CREATE OR REPLACE FUNCTION public.restore_school_v4(
    p_school_id UUID, 
    p_months_to_add INT DEFAULT 4,
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_new_expiry TIMESTAMPTZ;
BEGIN
    -- Security check
    IF NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT COALESCE(subscription_expiry, now()) INTO v_new_expiry
    FROM public.school_profiles
    WHERE school_id = p_school_id;

    IF v_new_expiry < now() THEN v_new_expiry := now(); END IF;
    v_new_expiry := v_new_expiry + (p_months_to_add || ' months')::interval;

    UPDATE public.school_profiles
    SET subscription_status = 'Active',
        subscription_expiry = v_new_expiry,
        status_notes = p_notes,
        updated_at = now()
    WHERE school_id = p_school_id;

    UPDATE public.school_features
    SET expires_at = v_new_expiry,
        updated_at = now()
    WHERE school_id = p_school_id AND is_enabled = true;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
