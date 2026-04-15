-- ============================================================
-- 004_ELEARNING.SQL — Assignments Module Schema
-- Full assignment lifecycle with file attachments,
-- external links, CBC grading labels, and submission tracking.
-- ============================================================

-- ─── 1. ASSIGNMENTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.el_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id),
  subject_id UUID REFERENCES public.tt_subjects(id),
  teacher_id UUID NOT NULL REFERENCES public.users(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  max_score DECIMAL(5,2) DEFAULT 100.00,
  submission_type TEXT NOT NULL DEFAULT 'both',
    -- file, text, both, link
  status TEXT NOT NULL DEFAULT 'draft',
    -- draft, published, closed
  published_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ela_school ON public.el_assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_ela_class ON public.el_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_ela_teacher ON public.el_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ela_status ON public.el_assignments(status);

-- ─── 2. ASSIGNMENT ATTACHMENTS (teacher brief files) ─────────
CREATE TABLE IF NOT EXISTS public.el_assignment_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.el_assignments(id) ON DELETE CASCADE,
  file_name TEXT,
  storage_path TEXT,       -- path in Supabase Storage (NOT signed URL)
  file_size INT,
  file_type TEXT,
  external_link TEXT,      -- Google Docs, Drive, etc.
  is_external BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elaa_assignment ON public.el_assignment_attachments(assignment_id);

-- ─── 3. SUBMISSIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.el_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.el_assignments(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  text_response TEXT,
  external_link TEXT,
  external_label TEXT,
  submitted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'not_submitted',
    -- not_submitted, submitted, late, graded
  score DECIMAL(5,2),
  grade_label TEXT DEFAULT 'not_graded',
    -- exceeding, proficient, developing, emerging, not_graded
  teacher_comment TEXT,
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_els_assignment ON public.el_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_els_student ON public.el_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_els_school ON public.el_submissions(school_id);
CREATE INDEX IF NOT EXISTS idx_els_status ON public.el_submissions(status);

-- ─── 4. SUBMISSION FILES (student uploaded files) ────────────
CREATE TABLE IF NOT EXISTS public.el_submission_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.el_submissions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,  -- path in Supabase Storage
  file_size INT,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elsf_submission ON public.el_submission_files(submission_id);

-- ─── 5. RLS ──────────────────────────────────────────────────
ALTER TABLE public.el_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.el_assignment_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.el_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.el_submission_files ENABLE ROW LEVEL SECURITY;

-- Assignments: teacher sees own, admin sees all, students see published
CREATE POLICY "ela_teacher_all" ON public.el_assignments
  FOR ALL USING (
    teacher_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    OR public.is_school_owner(school_id)
    OR public.is_school_admin(school_id)
  );

CREATE POLICY "ela_student_select" ON public.el_assignments
  FOR SELECT USING (
    status = 'published'
    AND class_id IN (
      SELECT c.id FROM public.classes c
      JOIN public.students s ON s.class_id = c.id
      JOIN public.parent_students ps ON ps.student_id = s.id
      JOIN public.users u ON u.id = ps.parent_id
      WHERE u.auth_user_id = auth.uid()
      UNION
      SELECT c.id FROM public.classes c
      JOIN public.students s ON s.class_id = c.id
      JOIN public.users u ON u.school_id = s.school_id
      WHERE u.auth_user_id = auth.uid() AND u.role = 'Student'
    )
  );

-- Assignment Attachments
CREATE POLICY "elaa_select" ON public.el_assignment_attachments
  FOR SELECT USING (
    assignment_id IN (SELECT id FROM public.el_assignments)
  );
CREATE POLICY "elaa_modify" ON public.el_assignment_attachments
  FOR ALL USING (
    assignment_id IN (
      SELECT id FROM public.el_assignments
      WHERE teacher_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
      OR public.is_school_owner(school_id) OR public.is_school_admin(school_id)
    )
  );

-- Submissions: teacher sees their assignment's submissions, student sees own
CREATE POLICY "els_teacher_select" ON public.el_submissions
  FOR SELECT USING (
    assignment_id IN (
      SELECT id FROM public.el_assignments
      WHERE teacher_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
    OR public.is_school_owner(school_id) OR public.is_school_admin(school_id)
  );

CREATE POLICY "els_student_all" ON public.el_submissions
  FOR ALL USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.users u ON u.school_id = s.school_id
      WHERE u.auth_user_id = auth.uid() AND u.role = 'Student'
    )
  );

CREATE POLICY "els_teacher_modify" ON public.el_submissions
  FOR UPDATE USING (
    assignment_id IN (
      SELECT id FROM public.el_assignments
      WHERE teacher_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
    OR public.is_school_owner(school_id) OR public.is_school_admin(school_id)
  );

-- Submission Files
CREATE POLICY "elsf_select" ON public.el_submission_files
  FOR SELECT USING (
    submission_id IN (SELECT id FROM public.el_submissions)
  );
CREATE POLICY "elsf_modify" ON public.el_submission_files
  FOR ALL USING (
    submission_id IN (
      SELECT id FROM public.el_submissions
      WHERE student_id IN (
        SELECT s.id FROM public.students s
        JOIN public.users u ON u.school_id = s.school_id
        WHERE u.auth_user_id = auth.uid()
      )
    )
  );
