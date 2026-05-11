-- ============================================================
-- 20260511_GRADE_SPECIFIC_TIMETABLE.SQL
-- Support for different lesson durations across curriculum levels.
-- ============================================================

-- 1. Add class_level column to timetable_configs
ALTER TABLE public.timetable_configs ADD COLUMN IF NOT EXISTS class_level TEXT;

-- 2. Update the RPC function to support the new column
CREATE OR REPLACE FUNCTION public.portal_get_timetable_config(p_school_id UUID, p_period_id UUID, p_class_level TEXT DEFAULT 'Global')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 
      'slot_index', slot_index, 
      'start_time', start_time, 
      'end_time', end_time, 
      'label', label,
      'name', label,
      'is_break', is_break,
      'class_level', class_level
    ) ORDER BY slot_index ASC), '[]'::jsonb)
    FROM public.timetable_configs 
    WHERE school_id = p_school_id 
      AND period_id = p_period_id
      AND (
        class_level = p_class_level 
        OR (class_level IS NULL AND NOT EXISTS (SELECT 1 FROM public.timetable_configs WHERE school_id = p_school_id AND period_id = p_period_id AND class_level = p_class_level))
      )
  );
END; $$;
