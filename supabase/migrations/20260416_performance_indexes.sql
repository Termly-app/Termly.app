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
CREATE INDEX IF NOT EXISTS idx_borrow_records_copy ON public.borrow_records(book_copy_id);
CREATE INDEX IF NOT EXISTS idx_borrow_records_status ON public.borrow_records(status);

-- 3. Fees & Student Payments
CREATE INDEX IF NOT EXISTS idx_fees_student_id ON public.fees(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_period_id ON public.fees(period_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_fee_id ON public.fee_payments(fee_id);

-- 4. Staff & Platform queries
CREATE INDEX IF NOT EXISTS idx_teachers_school ON public.teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_school ON public.payments(school_id);
