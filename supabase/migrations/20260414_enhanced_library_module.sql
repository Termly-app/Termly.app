-- ============================================================
-- ENHANCED LIBRARY MANAGEMENT SCHEMA
-- Resolving Phase 1 Requirements
-- ============================================================

-- Drop legacy tables (Cascade drops foreign constraints & policies automatically)
DROP TABLE IF EXISTS public.library_borrows CASCADE;
DROP TABLE IF EXISTS public.library_books CASCADE;

-- 1. BOOKS (Master Catalog)
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    author TEXT,
    isbn TEXT,
    subject TEXT,
    category TEXT NOT NULL DEFAULT 'textbook',
    level TEXT,
    publisher TEXT,
    edition TEXT,
    cover_image TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. BOOK COPIES
CREATE TABLE IF NOT EXISTS public.book_copies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    copy_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available', -- available, borrowed, lost, damaged, reserved
    condition TEXT DEFAULT 'good', -- new, good, fair, poor
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (book_id, copy_code)
);

-- 3. BORROW RECORDS
CREATE TABLE IF NOT EXISTS public.borrow_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    book_copy_id UUID NOT NULL REFERENCES public.book_copies(id) ON DELETE CASCADE,
    issued_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    returned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    borrow_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    status TEXT NOT NULL DEFAULT 'borrowed', -- borrowed, returned, overdue, lost
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. BOOK CLASS ALLOCATIONS
CREATE TABLE IF NOT EXISTS public.book_class_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    academic_year TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (school_id, book_id, class_name, academic_year)
);

-- 5. LIBRARY FINES
CREATE TABLE IF NOT EXISTS public.library_fines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    borrow_record_id UUID NOT NULL REFERENCES public.borrow_records(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    fine_type TEXT NOT NULL, -- overdue, lost, damaged
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status TEXT DEFAULT 'pending', -- pending, paid, waived
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- ── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_books_school ON public.books(school_id);
CREATE INDEX IF NOT EXISTS idx_books_category ON public.books(category);
CREATE INDEX IF NOT EXISTS idx_books_subject ON public.books(subject);

CREATE INDEX IF NOT EXISTS idx_book_copies_school ON public.book_copies(school_id);
CREATE INDEX IF NOT EXISTS idx_book_copies_book ON public.book_copies(book_id);
CREATE INDEX IF NOT EXISTS idx_book_copies_status ON public.book_copies(status);

CREATE INDEX IF NOT EXISTS idx_borrow_records_school ON public.borrow_records(school_id);
CREATE INDEX IF NOT EXISTS idx_borrow_records_student ON public.borrow_records(student_id);
CREATE INDEX IF NOT EXISTS idx_borrow_records_status ON public.borrow_records(status);
CREATE INDEX IF NOT EXISTS idx_borrow_records_due_date ON public.borrow_records(due_date);

CREATE INDEX IF NOT EXISTS idx_library_fines_student ON public.library_fines(student_id);
CREATE INDEX IF NOT EXISTS idx_library_fines_status ON public.library_fines(status);


-- ── RLS POLICIES ─────────────────────────────────────────────────────────────
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_class_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_fines ENABLE ROW LEVEL SECURITY;

-- Dynamic Policies using existing helper functions (schema is public)
CREATE POLICY "books_select" ON public.books FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "books_modify" ON public.books FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

CREATE POLICY "book_copies_select" ON public.book_copies FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "book_copies_modify" ON public.book_copies FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

CREATE POLICY "borrow_records_select" ON public.borrow_records FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "borrow_records_modify" ON public.borrow_records FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

CREATE POLICY "book_class_alloc_select" ON public.book_class_allocations FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "book_class_alloc_modify" ON public.book_class_allocations FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

CREATE POLICY "library_fines_select" ON public.library_fines FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "library_fines_modify" ON public.library_fines FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));


-- ── RPC TRANSACTIONS ─────────────────────────────────────────────────────────

-- 1. BULK GENERATE COPIES
CREATE OR REPLACE FUNCTION public.bulk_generate_copies(
    p_book_id UUID,
    p_school_id UUID,
    p_prefix TEXT,
    p_count INTEGER
) RETURNS SETOF public.book_copies
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_last_num INTEGER;
    v_new_code TEXT;
    v_inserted_id UUID;
    v_copy public.book_copies;
BEGIN
    -- Find max number for prefix
    SELECT COALESCE(MAX(NULLIF(regexp_replace(copy_code, '^' || p_prefix || '-?', '', 'g'), '')::INTEGER), 0)
    INTO v_last_num
    FROM public.book_copies
    WHERE book_id = p_book_id AND copy_code ~ ('^' || p_prefix || '-?[0-9]+$');

    FOR i IN 1..p_count LOOP
        v_last_num := v_last_num + 1;
        v_new_code := p_prefix || '-' || LPAD(v_last_num::TEXT, 3, '0');
        
        -- Insert returning row
        INSERT INTO public.book_copies (book_id, school_id, copy_code, status)
        VALUES (p_book_id, p_school_id, v_new_code, 'available')
        RETURNING * INTO v_copy;
        
        RETURN NEXT v_copy;
    END LOOP;
END;
$$;

-- 2. ISSUE BOOK
CREATE OR REPLACE FUNCTION public.issue_book(
    p_school_id UUID,
    p_student_id UUID,
    p_book_copy_id UUID,
    p_issued_by UUID,
    p_due_date DATE,
    p_notes TEXT DEFAULT NULL
) RETURNS public.borrow_records
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_copy_status TEXT;
    v_borrow public.borrow_records;
BEGIN
    SELECT status INTO v_copy_status FROM public.book_copies WHERE id = p_book_copy_id FOR UPDATE;
    
    IF v_copy_status != 'available' THEN
        RAISE EXCEPTION 'Book copy is currently %', v_copy_status;
    END IF;

    -- Update copy status
    UPDATE public.book_copies SET status = 'borrowed' WHERE id = p_book_copy_id;

    -- Create borrow record
    INSERT INTO public.borrow_records (
        school_id, student_id, book_copy_id, issued_by, 
        due_date, status, notes
    ) VALUES (
        p_school_id, p_student_id, p_book_copy_id, p_issued_by, 
        p_due_date, 'borrowed', p_notes
    ) RETURNING * INTO v_borrow;

    RETURN v_borrow;
END;
$$;

-- 3. RETURN BOOK
CREATE OR REPLACE FUNCTION public.return_book(
    p_borrow_record_id UUID,
    p_returned_to UUID,
    p_condition TEXT DEFAULT 'good',
    p_notes TEXT DEFAULT NULL
) RETURNS public.borrow_records
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_borrow public.borrow_records;
    v_copy_status TEXT := 'available';
BEGIN
    SELECT * INTO v_borrow FROM public.borrow_records WHERE id = p_borrow_record_id FOR UPDATE;

    IF v_borrow.status IN ('returned', 'replaced') THEN
        RAISE EXCEPTION 'Book already marked as %', v_borrow.status;
    END IF;

    -- Determine new copy status based on condition
    IF p_condition IN ('poor', 'damaged') THEN
        v_copy_status := 'damaged';
    END IF;

    -- Update records
    UPDATE public.book_copies SET status = v_copy_status, condition = p_condition WHERE id = v_borrow.book_copy_id;

    UPDATE public.borrow_records 
    SET status = 'returned', return_date = CURRENT_DATE, returned_to = p_returned_to, notes = p_notes
    WHERE id = p_borrow_record_id
    RETURNING * INTO v_borrow;

    RETURN v_borrow;
END;
$$;
