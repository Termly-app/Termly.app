-- ============================================================
-- LIBRARY MANAGEMENT SCHEMA
-- ============================================================

-- 1. Books Catalog
CREATE TABLE IF NOT EXISTS public.library_books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    author TEXT,
    isbn TEXT,
    book_code TEXT, -- Internal school barcode/code
    subject TEXT,
    grade TEXT, -- Target grade level
    total_copies INTEGER DEFAULT 1,
    available_copies INTEGER DEFAULT 1,
    location TEXT, -- Shelf/Room
    year_registered INTEGER DEFAULT extract(year from now()),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Borrow Tracking
CREATE TABLE IF NOT EXISTS public.library_borrows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    borrow_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    return_date DATE,
    status TEXT DEFAULT 'borrowed', -- borrowed, returned, overdue, lost
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ── RLS POLICIES ─────────────────────────────────────────────────────────────

ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_borrows ENABLE ROW LEVEL SECURITY;

-- Books
DROP POLICY IF EXISTS "Schools can manage their own books" ON public.library_books;
CREATE POLICY "Schools can manage their own books" ON public.library_books
    FOR ALL USING (school_id = (SELECT school_id FROM public.profiles WHERE auth_user_id = auth.uid()));

-- Borrows
DROP POLICY IF EXISTS "Schools can manage their own borrows" ON public.library_borrows;
CREATE POLICY "Schools can manage their own borrows" ON public.library_borrows
    FOR ALL USING (school_id = (SELECT school_id FROM public.profiles WHERE auth_user_id = auth.uid()));

-- ── INDEXES ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_lib_books_school ON public.library_books(school_id);
CREATE INDEX IF NOT EXISTS idx_lib_borrows_school ON public.library_borrows(school_id);
CREATE INDEX IF NOT EXISTS idx_lib_borrows_student ON public.library_borrows(student_id);
CREATE INDEX IF NOT EXISTS idx_lib_borrows_status ON public.library_borrows(status);
