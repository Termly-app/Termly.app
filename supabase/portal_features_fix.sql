-- RPC to allow portal users (unauthenticated) to check if a specific feature is enabled
-- This is required because school_features RLS blocks unauthenticated access.
CREATE OR REPLACE FUNCTION public.portal_has_feature(p_school_id UUID, p_feature_key TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT is_enabled INTO v_enabled
  FROM public.school_features
  WHERE school_id = p_school_id AND feature_key = p_feature_key;
  
  RETURN COALESCE(v_enabled, false);
END; $$;

-- Also update portal_get_school_profile to be more robust
CREATE OR REPLACE FUNCTION public.portal_get_school_profile(p_school_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(sp.*), '[]'::jsonb) 
    FROM public.school_profiles sp 
    WHERE school_id = p_school_id LIMIT 1
  );
END; $$;
