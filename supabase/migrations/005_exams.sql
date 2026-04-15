-- ============================================================
-- 005_EXAMS.SQL — Formal Exam Marks Module Schema
-- Full exam lifecycle: setup → open → closed → published
-- With papers, marks, grading scales, positions.
-- ============================================================

-- ─── 1. EXAMS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exam_type TEXT NOT NULL DEFAULT 'endterm',
    -- opener, midterm, endterm, mock, other
  term TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'setup',
    -- setup, open, closed, published
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_school ON public.exams(school_id, term, academic_year);
CREATE INDEX IF NOT EXISTS idx_exams_status ON public.exams(status);

-- ─── 2. EXAM PAPERS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exam_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id),
  class_id UUID NOT NULL REFERENCES public.classes(id),
  subject_id UUID NOT NULL REFERENCES public.tt_subjects(id),
  teacher_id UUID REFERENCES public.users(id),
  max_score DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  out_of DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  marks_entered INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, class_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_papers_exam ON public.exam_papers(exam_id);
CREATE INDEX IF NOT EXISTS idx_papers_teacher ON public.exam_papers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_papers_class ON public.exam_papers(class_id);

-- ─── 3. EXAM MARKS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exam_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_paper_id UUID NOT NULL REFERENCES public.exam_papers(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  raw_score DECIMAL(5,2),
  converted_score DECIMAL(5,2),
  grade VARCHAR(5),
  points SMALLINT,
  is_absent BOOLEAN DEFAULT FALSE,
  remarks TEXT,
  entered_by UUID REFERENCES public.users(id),
  entered_at TIMESTAMPTZ,
  updated_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_paper_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_marks_paper ON public.exam_marks(exam_paper_id);
CREATE INDEX IF NOT EXISTS idx_marks_student_ex ON public.exam_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_school_ex ON public.exam_marks(school_id);

-- ─── 4. EXAM RESULTS (calculated on close) ──────────────────
CREATE TABLE IF NOT EXISTS public.exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  class_id UUID NOT NULL REFERENCES public.classes(id),
  total_marks DECIMAL(7,2) DEFAULT 0,
  total_subjects INT DEFAULT 0,
  mean_score DECIMAL(5,2) DEFAULT 0,
  mean_grade VARCHAR(5),
  mean_points DECIMAL(3,1),
  class_position INT,
  stream_position INT,
  class_size INT,
  stream_size INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_results_exam ON public.exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_student ON public.exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_class ON public.exam_results(class_id);

-- ─── 5. GRADING SCALES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  scale_type TEXT NOT NULL DEFAULT '844', -- '844' or 'cbc'
  grade VARCHAR(5) NOT NULL,
  min_score DECIMAL(5,2) NOT NULL,
  max_score DECIMAL(5,2) NOT NULL,
  points SMALLINT,
  description TEXT,
  UNIQUE(school_id, scale_type, grade)
);

CREATE INDEX IF NOT EXISTS idx_gs_school ON public.grading_scales(school_id);

-- ─── 6. DEFAULT GRADING SCALES (inserted per school) ─────────
-- Function to seed default grades for a new school
CREATE OR REPLACE FUNCTION public.seed_grading_scales(p_school_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 8-4-4 Scale
  INSERT INTO public.grading_scales (school_id, scale_type, grade, min_score, max_score, points, description)
  VALUES
    (p_school_id, '844', 'A',  75, 100, 12, 'Excellent'),
    (p_school_id, '844', 'A-', 70, 74,  11, 'Very Good'),
    (p_school_id, '844', 'B+', 65, 69,  10, 'Good'),
    (p_school_id, '844', 'B',  60, 64,   9, 'Fairly Good'),
    (p_school_id, '844', 'B-', 55, 59,   8, 'Average'),
    (p_school_id, '844', 'C+', 50, 54,   7, 'Fairly Average'),
    (p_school_id, '844', 'C',  45, 49,   6, 'Below Average'),
    (p_school_id, '844', 'C-', 40, 44,   5, 'Fair'),
    (p_school_id, '844', 'D+', 35, 39,   4, 'Below Fair'),
    (p_school_id, '844', 'D',  30, 34,   3, 'Poor'),
    (p_school_id, '844', 'D-', 25, 29,   2, 'Very Poor'),
    (p_school_id, '844', 'E',   0, 24,   1, 'Fail'),
    -- CBC Scale
    (p_school_id, 'cbc', 'EE', 75, 100, NULL, 'Exceeds Expectation'),
    (p_school_id, 'cbc', 'ME', 50, 74,  NULL, 'Meets Expectation'),
    (p_school_id, 'cbc', 'AE', 25, 49,  NULL, 'Approaching Expectation'),
    (p_school_id, 'cbc', 'BE',  0, 24,  NULL, 'Below Expectation')
  ON CONFLICT (school_id, scale_type, grade) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── 7. CALCULATE EXAM RESULTS RPC ──────────────────────────
CREATE OR REPLACE FUNCTION public.calculate_exam_results(p_exam_id UUID)
RETURNS VOID AS $$
DECLARE
  v_school_id UUID;
  rec RECORD;
BEGIN
  SELECT school_id INTO v_school_id FROM public.exams WHERE id = p_exam_id;

  -- Clear previous results for this exam
  DELETE FROM public.exam_results WHERE exam_id = p_exam_id;

  -- Calculate per-student totals
  INSERT INTO public.exam_results (exam_id, student_id, school_id, class_id, total_marks, total_subjects, mean_score)
  SELECT
    p_exam_id,
    em.student_id,
    em.school_id,
    ep.class_id,
    SUM(COALESCE(em.converted_score, 0)),
    COUNT(em.id) FILTER (WHERE NOT em.is_absent),
    CASE WHEN COUNT(em.id) FILTER (WHERE NOT em.is_absent) > 0
      THEN ROUND(SUM(COALESCE(em.converted_score, 0)) / COUNT(em.id) FILTER (WHERE NOT em.is_absent), 2)
      ELSE 0
    END
  FROM public.exam_marks em
  JOIN public.exam_papers ep ON ep.id = em.exam_paper_id
  WHERE ep.exam_id = p_exam_id
  GROUP BY em.student_id, em.school_id, ep.class_id;

  -- Calculate mean grade from grading scale
  UPDATE public.exam_results er
  SET mean_grade = gs.grade, mean_points = gs.points
  FROM public.grading_scales gs
  WHERE gs.school_id = v_school_id
    AND er.exam_id = p_exam_id
    AND er.mean_score >= gs.min_score
    AND er.mean_score <= gs.max_score
    AND gs.scale_type = '844';

  -- Calculate class positions
  FOR rec IN
    SELECT DISTINCT class_id FROM public.exam_results WHERE exam_id = p_exam_id
  LOOP
    WITH ranked AS (
      SELECT id, total_marks,
        RANK() OVER (ORDER BY total_marks DESC) AS pos,
        COUNT(*) OVER () AS total
      FROM public.exam_results
      WHERE exam_id = p_exam_id AND class_id = rec.class_id
    )
    UPDATE public.exam_results er
    SET class_position = ranked.pos, class_size = ranked.total
    FROM ranked
    WHERE er.id = ranked.id;

    -- Stream positions (students in same class name but different stream)
    -- For now, stream_position = class_position (can be refined)
    UPDATE public.exam_results
    SET stream_position = class_position, stream_size = class_size
    WHERE exam_id = p_exam_id AND class_id = rec.class_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── 8. RLS ──────────────────────────────────────────────────
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;

-- Exams
CREATE POLICY "exams_select" ON public.exams
  FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "exams_modify" ON public.exams
  FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

-- Exam Papers: teachers see their own
CREATE POLICY "papers_select" ON public.exam_papers
  FOR SELECT USING (
    school_id = public.get_auth_school_id() OR public.is_school_owner(school_id)
  );
CREATE POLICY "papers_modify" ON public.exam_papers
  FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

-- Exam Marks: teacher can modify their papers
CREATE POLICY "emarks_select" ON public.exam_marks
  FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "emarks_modify" ON public.exam_marks
  FOR ALL USING (
    exam_paper_id IN (
      SELECT id FROM public.exam_papers
      WHERE teacher_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
    OR public.is_school_owner(school_id) OR public.is_school_admin(school_id)
  );

-- Results
CREATE POLICY "results_select" ON public.exam_results
  FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "results_modify" ON public.exam_results
  FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

-- Grading Scales
CREATE POLICY "gs_select" ON public.grading_scales
  FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "gs_modify" ON public.grading_scales
  FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));
