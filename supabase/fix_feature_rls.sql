-- Allow school users to view their own enabled features
DROP POLICY IF EXISTS "Schools can view their own features" ON public.school_features;
CREATE POLICY "Schools can view their own features" ON public.school_features
    FOR SELECT
    USING (school_id = (auth.jwt() ->> 'school_id')::uuid);

-- Ensure features_registry is readable by everyone (it's public metadata)
ALTER TABLE public.features_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Registry is publicly readable" ON public.features_registry;
CREATE POLICY "Registry is publicly readable" ON public.features_registry
    FOR SELECT
    TO authenticated, anon
    USING (true);
