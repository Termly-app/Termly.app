-- LMS SCHEMA: Assignments and Submissions
-- Optimized for DB storage by using content_url (linking to Supabase Storage)

CREATE TABLE IF NOT EXISTS lms_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    class TEXT NOT NULL,
    stream TEXT,
    subject TEXT NOT NULL,
    title TEXT NOT NULL,
    description_url TEXT, -- Link to .txt/.json in Supabase Storage
    due_date TIMESTAMP WITH TIME ZONE,
    cutoff_date TIMESTAMP WITH TIME ZONE,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'published', -- published, draft, archived
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lms_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES lms_assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    content_url TEXT, -- Link to student response in Supabase Storage
    grade TEXT,
    feedback TEXT,
    workflow_status TEXT DEFAULT 'submitted', -- submitted, graded, returned
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE lms_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_submissions ENABLE ROW LEVEL SECURITY;

-- Basic Policies
CREATE POLICY "Schools see their own assignments" ON lms_assignments
    FOR ALL USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE school_id = lms_assignments.school_id));

CREATE POLICY "Schools see their own submissions" ON lms_submissions
    FOR ALL USING (assignment_id IN (SELECT id FROM lms_assignments));
