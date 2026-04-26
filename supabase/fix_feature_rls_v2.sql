-- Allow school users to view their own enabled features using a more reliable JOIN-based check
DROP POLICY IF EXISTS "Schools can view their own features" ON public.school_features;
CREATE POLICY "Schools can view their own features" ON public.school_features
    FOR SELECT
    USING (
        school_id IN (
            SELECT school_id FROM public.users WHERE auth_user_id = auth.uid()
        )
    );

-- Ensure features_registry is readable by everyone (it's public metadata)
ALTER TABLE public.features_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Registry is publicly readable" ON public.features_registry;
CREATE POLICY "Registry is publicly readable" ON public.features_registry
    FOR SELECT
    TO authenticated, anon
    USING (true);
