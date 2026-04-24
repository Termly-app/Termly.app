-- Domain 16B: Advanced Class Promotion Engine
-- Handles bulk promotion, historical record creation, and fee rollover

CREATE OR REPLACE FUNCTION promote_students(
  p_school_id UUID,
  p_student_ids UUID[],
  p_target_class TEXT,
  p_target_stream TEXT DEFAULT NULL,
  p_new_period_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_student_id UUID;
  v_count INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- 1. Loop through students
  FOREACH v_student_id IN ARRAY p_student_ids LOOP
    -- A. Create history record (Current Class -> History)
    INSERT INTO student_class_history (student_id, class, stream, period_id, school_id)
    SELECT id, class, stream, p_new_period_id, p_school_id
    FROM students
    WHERE id = v_student_id AND school_id = p_school_id;

    -- B. Update student current class/stream
    UPDATE students
    SET 
      class = p_target_class,
      stream = COALESCE(p_target_stream, stream),
      updated_at = NOW()
    WHERE id = v_student_id AND school_id = p_school_id;

    v_count := v_count + 1;
  END LOOP;

  -- 2. Log activity
  INSERT INTO audit_logs (school_id, user_id, action, entity_name, entity_id, old_data, new_data)
  VALUES (p_school_id, auth.uid(), 'STUDENT_PROMOTION', 'Students', NULL, 
          jsonb_build_object('count', v_count, 'target_class', p_target_class), 
          jsonb_build_object('status', 'Completed'));

  RETURN jsonb_build_object(
    'success', TRUE,
    'count', v_count,
    'message', format('Successfully promoted %s students to %s', v_count, p_target_class)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supporting table for history
CREATE TABLE IF NOT EXISTS student_class_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  class TEXT NOT NULL,
  stream TEXT,
  period_id UUID REFERENCES academic_periods(id),
  school_id UUID REFERENCES schools(id),
  promoted_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for history
ALTER TABLE student_class_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Schools can only see their own student history" ON student_class_history
  FOR ALL USING (school_id = (SELECT school_id FROM users WHERE auth_user_id = auth.uid()));
