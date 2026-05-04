-- ============================================================
-- 20260505: Parent Portal Results Bridge
-- Problem: Parent Portal queries exam_results (empty) for grades,
-- but actual data lives in the marks table.
-- Solution: Create an RPC that aggregates marks per exam_type
-- into a format the portal dashboard can consume directly.
-- ============================================================

-- 1. Get a student's marks grouped by exam type (for the Results view)
DROP FUNCTION IF EXISTS public.portal_get_student_results(uuid);

CREATE OR REPLACE FUNCTION public.portal_get_student_results(p_student_id uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(exam_row ORDER BY exam_row->>'exam_type'), '[]'::jsonb)
        FROM (
            SELECT jsonb_build_object(
                'id', md5(m.exam_type || m.school_id::text || p_student_id::text)::uuid,
                'exam_name', COALESCE(m.exam_type, 'End Term'),
                'exam_type', COALESCE(m.exam_type, 'End Term'),
                'exam_term', COALESCE(m.exam_type, 'End Term'),
                'total_marks', SUM(COALESCE(m.mark, 0)),
                'total_subjects', COUNT(*),
                'mean_score', ROUND(AVG(COALESCE(m.mark, 0))::numeric, 1),
                'subjects', jsonb_agg(
                    jsonb_build_object(
                        'subject', m.subject,
                        'mark', m.mark
                    ) ORDER BY m.subject
                )
            ) AS exam_row
            FROM public.marks m
            WHERE m.student_id = p_student_id
              AND m.mark IS NOT NULL
            GROUP BY m.exam_type, m.school_id
        ) sub
    );
END;
$$;

-- 2. Get student's fee summary (direct, bypasses RLS)
DROP FUNCTION IF EXISTS public.portal_get_student_fee_summary(uuid);

CREATE OR REPLACE FUNCTION public.portal_get_student_fee_summary(p_student_id uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_fee RECORD;
    v_payments JSONB;
BEGIN
    SELECT id, total_fee, paid, balance, period_id
    INTO v_fee
    FROM public.fees
    WHERE student_id = p_student_id
    ORDER BY created_at DESC NULLS LAST
    LIMIT 1;

    IF v_fee IS NULL THEN
        RETURN jsonb_build_object(
            'total_fee', 0,
            'paid', 0,
            'balance', 0,
            'payments', '[]'::jsonb
        );
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', fp.id,
            'amount', fp.amount,
            'date', fp.date,
            'method', COALESCE(fp.method, 'Payment'),
            'reference', COALESCE(fp.reference, ''),
            'status', COALESCE(fp.status, 'Confirmed')
        ) ORDER BY fp.date DESC
    ), '[]'::jsonb)
    INTO v_payments
    FROM public.fee_payments fp
    WHERE fp.fee_id = v_fee.id
      AND COALESCE(fp.status, 'Confirmed') != 'Voided';

    RETURN jsonb_build_object(
        'total_fee', COALESCE(v_fee.total_fee, 0),
        'paid', COALESCE(v_fee.paid, 0),
        'balance', COALESCE(v_fee.balance, 0),
        'fee_id', v_fee.id,
        'period_id', v_fee.period_id,
        'payments', v_payments
    );
END;
$$;

-- 3. Get student's subjects from their student record
DROP FUNCTION IF EXISTS public.portal_get_student_subjects(uuid);

CREATE OR REPLACE FUNCTION public.portal_get_student_subjects(p_student_id uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student RECORD;
    v_subjects JSONB;
BEGIN
    SELECT id, name, class, school_id, subjects
    INTO v_student
    FROM public.students
    WHERE id = p_student_id;

    IF v_student IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    -- If student has subjects stored as JSONB array, use those
    IF v_student.subjects IS NOT NULL AND jsonb_array_length(v_student.subjects) > 0 THEN
        RETURN v_student.subjects;
    END IF;

    -- Otherwise, get unique subjects from marks table
    SELECT COALESCE(jsonb_agg(DISTINCT m.subject ORDER BY m.subject), '[]'::jsonb)
    INTO v_subjects
    FROM public.marks m
    WHERE m.student_id = p_student_id
      AND m.subject IS NOT NULL;

    RETURN v_subjects;
END;
$$;
