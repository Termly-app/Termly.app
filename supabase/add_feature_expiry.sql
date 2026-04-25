-- Add expires_at column to school_features for granular access control
ALTER TABLE public.school_features 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Update RLS policies to ensure transparency
DROP POLICY IF EXISTS "Users read own school features" ON public.school_features;
CREATE POLICY "Users read own school features" ON public.school_features
    FOR SELECT USING (
        school_id = (auth.jwt() ->> 'school_id')::uuid 
        OR public.is_platform_admin()
    );

COMMENT ON COLUMN public.school_features.expires_at IS 'The date/time when this feature module will expire for the specific school.';

-- Reload schema for PostgREST
NOTIFY pgrst, 'reload schema';
