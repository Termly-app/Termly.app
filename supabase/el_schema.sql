-- ShuleSoft E-Learning (LMS) Schema
-- Run this in your Supabase SQL Editor to create the missing LMS tables.

-- 1. Create Assignments Table
CREATE TABLE IF NOT EXISTS public.el_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    class TEXT NOT NULL,
    stream TEXT,
    subject TEXT NOT NULL,
    description TEXT,
    links TEXT,
    allow_from TIMESTAMPTZ NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    cutoff_date TIMESTAMPTZ NOT NULL,
    max_score INTEGER DEFAULT 100,
    submission_type TEXT DEFAULT 'online_text', 
    questions JSONB, 
    teacher TEXT,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Submissions Table
CREATE TABLE IF NOT EXISTS public.el_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES public.el_assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    content_url TEXT,
    answers JSONB,
    workflow_status TEXT DEFAULT 'Submitted',
    grade_numeric NUMERIC,
    feedback TEXT,
    is_late BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(assignment_id, student_id)
);

-- 3. Set up basic RLS
ALTER TABLE public.el_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.el_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" 
ON public.el_assignments FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users submissions" 
ON public.el_submissions FOR ALL USING (auth.role() = 'authenticated');

-- 4. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
