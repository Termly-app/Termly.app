-- 1. FIX EXAM RESULTS RPC
-- The live exam_results table lacks aggregate columns and exam_id. We must use the marks table
-- and join with exams to get the released_to_parents flag and exam metadata.
DROP FUNCTION IF EXISTS public.portal_get_student_results_v2(uuid, uuid);
CREATE OR REPLACE FUNCTION public.portal_get_student_results_v2(p_student_id uuid, p_school_id uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_results JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(exam_row ORDER BY exam_row->>'exam_type'), '[]'::jsonb)
    INTO v_results
    FROM (
        SELECT jsonb_build_object(
            'id', md5(m.exam_type || m.school_id::text || p_student_id::text)::uuid,
            'exam_name', COALESCE(e.name, m.exam_type),
            'exam_type', COALESCE(m.exam_type, 'End Term'),
            'exam_term', COALESCE(e.term, m.exam_type),
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
        LEFT JOIN public.exams e ON m.exam_type = e.exam_type AND m.school_id = e.school_id
        WHERE m.student_id = p_student_id
          AND m.school_id = p_school_id
          AND m.mark IS NOT NULL
          AND e.status ILIKE 'published'
          AND e.released_to_parents = TRUE
        GROUP BY m.exam_type, m.school_id, e.name, e.term, p_student_id
    ) sub;

    RETURN v_results;
END;
$$;

-- 2. FIX FEES SUMMARY RPC
-- Must return keys expected by store.js: total_fee, paid, balance, fee_id, period_id, payments, no_record_for_current_period
-- The fees table does not have created_at, so we order by id DESC.
DROP FUNCTION IF EXISTS public.portal_get_student_fee_summary(uuid, uuid);
DROP FUNCTION IF EXISTS public.portal_get_student_fee_summary(uuid);

CREATE OR REPLACE FUNCTION public.portal_get_student_fee_summary(p_student_id uuid, p_school_id uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_active_period_id UUID;
    v_fee RECORD;
    v_payments JSONB;
BEGIN
    SELECT id INTO v_active_period_id
    FROM public.academic_periods
    WHERE school_id = p_school_id AND is_active = true
    LIMIT 1;

    SELECT id, total_fee, paid, balance, period_id
    INTO v_fee
    FROM public.fees
    WHERE student_id = p_student_id
      AND school_id = p_school_id
      AND (v_active_period_id IS NULL OR period_id = v_active_period_id)
    ORDER BY id DESC
    LIMIT 1;

    IF v_fee IS NULL THEN
        SELECT id, total_fee, paid, balance, period_id
        INTO v_fee
        FROM public.fees
        WHERE student_id = p_student_id
          AND school_id = p_school_id
        ORDER BY id DESC
        LIMIT 1;
    END IF;

    IF v_fee IS NULL THEN
        RETURN jsonb_build_object(
            'total_fee', 0,
            'paid', 0,
            'balance', 0,
            'fee_id', null,
            'period_id', v_active_period_id,
            'payments', '[]'::jsonb,
            'no_record_for_current_period', true
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
        ) ORDER BY fp.id DESC
    ), '[]'::jsonb)
    INTO v_payments
    FROM public.fee_payments fp
    WHERE fp.fee_id = v_fee.id AND COALESCE(fp.status, 'Confirmed') != 'Voided';

    RETURN jsonb_build_object(
        'total_fee', COALESCE(v_fee.total_fee, 0),
        'paid', COALESCE(v_fee.paid, 0),
        'balance', COALESCE(v_fee.balance, 0),
        'fee_id', v_fee.id,
        'period_id', v_fee.period_id,
        'payments', v_payments,
        'no_record_for_current_period', false
    );
END;
$$;

-- 3. FIX ANNOUNCEMENTS RPC
-- The announcements table has content, not body.
DROP FUNCTION IF EXISTS public.portal_get_announcements_v2(uuid);
CREATE OR REPLACE FUNCTION public.portal_get_announcements_v2(p_school_id uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', a.id,
            'title', a.title,
            'body', a.content,
            'created_at', a.created_at,
            'status', a.status
        ) ORDER BY a.created_at DESC), '[]'::jsonb)
        FROM public.announcements a
        WHERE a.school_id = p_school_id
          AND a.status ILIKE 'published'
    );
END;
$$;

-- 4. FIX ASSIGNMENTS RPC
-- Live table columns: id, title, description, due_date, subject, class, stream, status, created_at, school_id
DROP FUNCTION IF EXISTS public.portal_get_assignments_v2(uuid, uuid);
DROP FUNCTION IF EXISTS public.portal_get_assignments_v2(uuid, text);
DROP FUNCTION IF EXISTS public.portal_get_assignments_v2(uuid);

CREATE OR REPLACE FUNCTION public.portal_get_assignments_v2(p_school_id uuid, p_class_id text DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', a.id,
            'title', a.title,
            'description', a.description,
            'subject', a.subject,
            'subject_id', a.subject,
            'class', a.class,
            'class_id', a.class,
            'due_date', a.due_date,
            'status', COALESCE(a.status, 'published'),
            'created_at', a.created_at
        ) ORDER BY a.due_date DESC), '[]'::jsonb)
        FROM public.el_assignments a
        WHERE a.school_id = p_school_id
          AND (a.status IS NULL OR a.status ILIKE 'published' OR a.status ILIKE 'active')
          AND (p_class_id IS NULL OR p_class_id = '' OR a.class = p_class_id)
    );
END;
$$;
