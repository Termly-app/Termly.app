-- =========================================================================================
-- MIGRATION: Performance Indexes
-- Purpose: Adds targeted B-Tree indexes on heavily queried columns that represent
--          significant bottlenecks during data retrieval.
-- =========================================================================================

-- 1. Students Filtering (By School and Class for tables/dropdowns)
-- This query combination is used in almost every academic/finance module.
CREATE INDEX IF NOT EXISTS idx_students_school_class ON public.students(school_id, class);
CREATE INDEX IF NOT EXISTS idx_students_adm_no ON public.students(adm_no);

-- 2. Library Queries (Issue/Return screens filter copies and borrowings heavily)
CREATE INDEX IF NOT EXISTS idx_book_copies_book_id ON public.book_copies(book_id);
CREATE INDEX IF NOT EXISTS idx_book_copies_copy_code ON public.book_copies(copy_code);
CREATE INDEX IF NOT EXISTS idx_borrow_records_student ON public.borrow_records(student_id);
CREATE INDEX IF NOT EXISTS idx_borrow_records_copy ON public.borrow_records(copy_id);
CREATE INDEX IF NOT EXISTS idx_borrow_records_status ON public.borrow_records(status);

-- 3. Invoices & Payments (Checking outstanding balances)
CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON public.invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_period_id ON public.invoices(period_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);

-- 4. Staff queries
CREATE INDEX IF NOT EXISTS idx_staff_school ON public.staff(school_id);
