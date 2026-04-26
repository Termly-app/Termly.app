-- ============================================================
-- ShuleSoft Consolidated Database Update (2026-04-26)
-- Handles deactivation, features management, and system health.
-- ============================================================

-- 1. Ensure core columns exist in school_profiles
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_profiles' AND column_name = 'subscription_status') THEN
        ALTER TABLE public.school_profiles ADD COLUMN subscription_status TEXT DEFAULT 'Inactive';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_profiles' AND column_name = 'subscription_expiry') THEN
        ALTER TABLE public.school_profiles ADD COLUMN subscription_expiry TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'features_registry' AND column_name = 'is_beta') THEN
        ALTER TABLE public.features_registry ADD COLUMN is_beta BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Restore / Activate School Function
CREATE OR REPLACE FUNCTION public.restore_school_v3(
    p_school_id UUID, 
    p_months_to_add INT DEFAULT 4
)
RETURNS VOID AS $$
DECLARE
    v_new_expiry TIMESTAMPTZ;
BEGIN
    -- Security check
    IF NOT (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'Admin' 
       AND NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())) THEN
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
        updated_at = now()
    WHERE school_id = p_school_id;

    UPDATE public.school_features
    SET expires_at = v_new_expiry,
        updated_at = now()
    WHERE school_id = p_school_id AND is_enabled = true;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Deactivate School Function
CREATE OR REPLACE FUNCTION public.deactivate_school_v3(
    p_school_id UUID
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
        updated_at = now()
    WHERE school_id = p_school_id;

    UPDATE public.school_features
    SET expires_at = v_past_date,
        updated_at = now()
    WHERE school_id = p_school_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Initial Feature Registry Population (if empty)
INSERT INTO public.features_registry (feature_key, feature_name, description, is_beta)
VALUES 
    ('grading', 'Academic Grading', 'Automated exam processing and report cards.', false),
    ('attendance', 'Student Attendance', 'Digital roll calls and SMS alerts to parents.', false),
    ('fees', 'Fee Management', 'M-Pesa reconciliation and billing.', false),
    ('timetable', 'Smart Timetable', 'Conflict-aware scheduling for staff and classes.', false),
    ('lms', 'E-Learning (LMS)', 'Digital notes, assignments and online exams.', false),
    ('communications', 'Comm. Center', 'Bulk SMS and email integration.', false),
    ('library', 'Library Manager', 'Track book borrowing and penalties.', false),
    ('nemis', 'NEMIS Audit', 'Compliance checks for national education systems.', false),
    ('teacher_portal', 'Teacher Portal', 'Dedicated login for staff grading and attendance.', false)
ON CONFLICT (feature_key) DO NOTHING;

-- Reload schema
NOTIFY pgrst, 'reload schema';
