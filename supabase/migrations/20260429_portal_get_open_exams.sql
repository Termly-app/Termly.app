-- Add RPC for Portal to fetch open exams

CREATE OR REPLACE FUNCTION public.portal_get_open_exams(p_school_id uuid)
RETURNS TABLE (
    id uuid,
    name text,
    term text,
    exam_type text,
    status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id, 
        e.name, 
        e.term, 
        e.exam_type, 
        e.status
    FROM public.exams e
    WHERE e.school_id = p_school_id
      AND e.status IN ('open', 'published', 'setup', 'active')
    ORDER BY e.created_at DESC;
END;
$$;
