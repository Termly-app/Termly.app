-- ============================================================
-- FIX: portal_get_open_exams RPC
-- Problem: Teachers see zero exams on the Staff Portal because
-- the previous version filtered out exams with status='Draft',
-- but exams are created with status='setup' by default, and
-- the admin UI never changes this to 'published' or 'open'.
-- 
-- Fix: Return ALL exams for the school that are NOT explicitly
-- archived or closed. Also return exam_type for the UI.
-- ============================================================

CREATE OR REPLACE FUNCTION public.portal_get_open_exams(p_school_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 
      'name', name, 
      'term', term, 
      'exam_type', exam_type,
      'status', status
    ) ORDER BY created_at DESC), '[]'::jsonb)
    FROM public.exams 
    WHERE school_id = p_school_id 
      AND status NOT IN ('archived', 'closed', 'deleted')
  );
END; $$;
