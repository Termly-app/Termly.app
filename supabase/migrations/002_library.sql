-- ============================================================
-- 002_LIBRARY.SQL — Enhanced Library Module Schema
-- Replaces the simpler library_schema.sql with full
-- book copies, fines, and class allocations support.
-- ============================================================

-- ─── 1. BOOKS CATALOG (enhanced) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  isbn VARCHAR(20),
  subject TEXT,
  category TEXT NOT NULL DEFAULT 'textbook',
    -- textbook, setbook, revision, storybook, reference
  level TEXT,
  publisher TEXT,
  edition TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_school ON public.books(school_id);
CREATE INDEX IF NOT EXISTS idx_books_category ON public.books(category);
CREATE INDEX IF NOT EXISTS idx_books_subject ON public.books(school_id, subject);

-- ─── 2. BOOK COPIES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.book_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  copy_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
    -- available, borrowed, lost, damaged
  condition TEXT DEFAULT 'good',
    -- new, good, fair, poor
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, copy_code)
);

CREATE INDEX IF NOT EXISTS idx_copies_book ON public.book_copies(book_id);
CREATE INDEX IF NOT EXISTS idx_copies_status ON public.book_copies(status);

-- ─── 3. BORROW RECORDS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.borrow_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  book_copy_id UUID NOT NULL REFERENCES public.book_copies(id),
  issued_by UUID NOT NULL REFERENCES public.users(id),
  returned_to UUID REFERENCES public.users(id),
  borrow_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  return_date DATE,
  status TEXT NOT NULL DEFAULT 'borrowed',
    -- borrowed, returned, overdue, lost
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_borrow_school ON public.borrow_records(school_id);
CREATE INDEX IF NOT EXISTS idx_borrow_student ON public.borrow_records(student_id);
CREATE INDEX IF NOT EXISTS idx_borrow_status ON public.borrow_records(status);
CREATE INDEX IF NOT EXISTS idx_borrow_due ON public.borrow_records(due_date);
CREATE INDEX IF NOT EXISTS idx_borrow_copy ON public.borrow_records(book_copy_id);

-- ─── 4. BOOK CLASS ALLOCATIONS ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.book_class_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  book_id UUID NOT NULL REFERENCES public.books(id),
  class_id UUID NOT NULL REFERENCES public.classes(id),
  quantity INT NOT NULL DEFAULT 0,
  academic_year TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, book_id, class_id, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_alloc_school ON public.book_class_allocations(school_id);

-- ─── 5. LIBRARY FINES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.library_fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrow_record_id UUID NOT NULL REFERENCES public.borrow_records(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  fine_type TEXT NOT NULL,  -- overdue, lost, damaged
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status TEXT DEFAULT 'pending',  -- pending, paid, waived
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fines_student ON public.library_fines(student_id);
CREATE INDEX IF NOT EXISTS idx_fines_status ON public.library_fines(status);
CREATE INDEX IF NOT EXISTS idx_fines_school ON public.library_fines(school_id);

-- ─── 6. RLS ──────────────────────────────────────────────────
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_class_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_fines ENABLE ROW LEVEL SECURITY;

-- Books
DROP POLICY IF EXISTS "books_select" ON public.books;
CREATE POLICY "books_select" ON public.books
  FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
DROP POLICY IF EXISTS "books_modify" ON public.books;
CREATE POLICY "books_modify" ON public.books
  FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

-- Book Copies (access via book → school_id)
DROP POLICY IF EXISTS "copies_select" ON public.book_copies;
CREATE POLICY "copies_select" ON public.book_copies
  FOR SELECT USING (
    book_id IN (SELECT id FROM public.books WHERE school_id = public.get_auth_school_id())
    OR book_id IN (SELECT id FROM public.books WHERE public.is_school_owner(school_id))
  );
DROP POLICY IF EXISTS "copies_modify" ON public.book_copies;
CREATE POLICY "copies_modify" ON public.book_copies
  FOR ALL USING (
    book_id IN (SELECT id FROM public.books WHERE public.is_school_owner(school_id) OR public.is_school_admin(school_id))
  );

-- Borrow Records
DROP POLICY IF EXISTS "borrow_select" ON public.borrow_records;
CREATE POLICY "borrow_select" ON public.borrow_records
  FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
DROP POLICY IF EXISTS "borrow_modify" ON public.borrow_records;
CREATE POLICY "borrow_modify" ON public.borrow_records
  FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

-- Allocations
DROP POLICY IF EXISTS "alloc_select" ON public.book_class_allocations;
CREATE POLICY "alloc_select" ON public.book_class_allocations
  FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
DROP POLICY IF EXISTS "alloc_modify" ON public.book_class_allocations;
CREATE POLICY "alloc_modify" ON public.book_class_allocations
  FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

-- Fines
DROP POLICY IF EXISTS "fines_select" ON public.library_fines;
CREATE POLICY "fines_select" ON public.library_fines
  FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
DROP POLICY IF EXISTS "fines_modify" ON public.library_fines;
CREATE POLICY "fines_modify" ON public.library_fines
  FOR ALL USING (public.is_school_owner(school_id) OR public.is_school_admin(school_id));

-- ─── 7. HELPER RPC: BULK COPY GENERATION ─────────────────────
CREATE OR REPLACE FUNCTION public.bulk_generate_copies(
  p_book_id UUID,
  p_prefix TEXT,
  p_count INT
) RETURNS INT AS $$
DECLARE
  existing_max INT;
  new_count INT := 0;
  i INT;
  code TEXT;
BEGIN
  -- Find the highest existing number for this prefix
  SELECT COALESCE(MAX(
    NULLIF(REGEXP_REPLACE(copy_code, '^' || p_prefix, ''), '')::INT
  ), 0) INTO existing_max
  FROM public.book_copies
  WHERE book_id = p_book_id
    AND copy_code LIKE p_prefix || '%';

  FOR i IN 1..p_count LOOP
    code := p_prefix || LPAD((existing_max + i)::TEXT, 3, '0');
    BEGIN
      INSERT INTO public.book_copies (book_id, copy_code, status, condition)
      VALUES (p_book_id, code, 'available', 'new');
      new_count := new_count + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Skip duplicates
      CONTINUE;
    END;
  END LOOP;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
