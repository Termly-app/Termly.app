-- ============================================================
-- 20260727_portal_student_library_books.sql
--
-- Parent portal currently shows nothing from the library module.
-- This adds one RPC, following the same shape as the other
-- portal_get_student_* functions (SECURITY DEFINER, school_id +
-- student_id scoped, no RLS dependency since portal sessions are
-- anonymous) — mirrors getActiveLoans()'s real query exactly
-- (borrow_records -> book_copies -> books), so it returns the
-- same shape of data the admin Library pages already work with.
-- ============================================================

DROP FUNCTION IF EXISTS public.portal_get_student_books(uuid, uuid);
CREATE OR REPLACE FUNCTION public.portal_get_student_books(p_student_id uuid, p_school_id uuid)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', br.id,
      'title', b.title,
      'isbn', b.isbn,
      'copy_code', bc.copy_code,
      'due_date', br.due_date,
      'is_overdue', (br.due_date < CURRENT_DATE)
    ) ORDER BY br.due_date ASC
  ), '[]'::jsonb)
  FROM public.borrow_records br
  JOIN public.book_copies bc ON br.book_copy_id = bc.id
  JOIN public.books b ON bc.book_id = b.id
  WHERE br.student_id = p_student_id
    AND br.school_id = p_school_id
    AND br.status = 'borrowed';
$$;
