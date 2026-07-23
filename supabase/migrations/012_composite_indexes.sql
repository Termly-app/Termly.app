-- 012_composite_indexes.sql
-- Add composite indexes for fee/results queries filtered on (student_id, school_id, period_id)

CREATE INDEX IF NOT EXISTS idx_fees_student_school_period 
ON public.fees (student_id, school_id, period_id);

CREATE INDEX IF NOT EXISTS idx_marks_student_school_period 
ON public.marks (student_id, school_id, period_id);

CREATE INDEX IF NOT EXISTS idx_exam_marks_student_school 
ON public.exam_marks (student_id, school_id);
