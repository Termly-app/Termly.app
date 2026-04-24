-- ============================================================
-- PHASE 2: EXAM PUBLISH WORKFLOW (DB TRIGGERS)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create the function to enforce teacher entry constraints
CREATE OR REPLACE FUNCTION public.check_teacher_mark_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_teacher_entry_open BOOLEAN;
  v_user_role TEXT;
  v_target_exam_id UUID;
BEGIN
  -- Get the current user's role from the JWT
  v_user_role := current_setting('request.jwt.claims', true)::json->>'role';

  -- If it's an admin or platform admin, bypass the check
  IF v_user_role = 'admin' OR public.is_platform_admin() THEN
    RETURN NEW;
  END IF;

  -- Determine the exam_id based on the table structure
  IF TG_TABLE_NAME = 'exam_marks' THEN
    -- Fetch exam_id from exam_papers
    SELECT exam_id INTO v_target_exam_id
    FROM public.exam_papers
    WHERE id = NEW.exam_paper_id;
  ELSIF TG_TABLE_NAME = 'marks' THEN
    -- For legacy marks table, it might use exam_session_id or exam_id
    BEGIN
      v_target_exam_id := NEW.exam_id;
    EXCEPTION WHEN undefined_column THEN
      v_target_exam_id := NEW.exam_session_id;
    END;
  END IF;

  -- For teachers, check if the exam session is open for entry
  SELECT teacher_entry_open INTO v_teacher_entry_open
  FROM public.exam_publish_settings
  WHERE exam_id = v_target_exam_id;

  -- If the setting doesn't exist or is false, block the teacher
  IF v_teacher_entry_open IS NOT TRUE THEN
    RAISE EXCEPTION 'Mark entry is closed for this exam. Please wait for the admin to publish it.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger to the exam_marks table
DROP TRIGGER IF EXISTS trg_check_teacher_exam_mark_entry ON public.exam_marks;
CREATE TRIGGER trg_check_teacher_exam_mark_entry
  BEFORE INSERT OR UPDATE ON public.exam_marks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_teacher_mark_entry();
