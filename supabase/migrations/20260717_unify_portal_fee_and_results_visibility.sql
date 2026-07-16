-- ============================================================
-- 20260717_unify_portal_fee_and_results_visibility.sql
--
-- Root-causes two separate "parent portal doesn't match admin
-- portal" bugs. Both are the same underlying pattern: the portal
-- (parent-facing) query and the admin-facing query independently
-- evolved different rules for "which row counts," so they can
-- legitimately disagree even when both are working as written.
--
-- FEES: admin's getFees() (src/data/store.js) always scopes to
-- academic_periods.is_active. portal_get_student_fee_summary /
-- portal_get_student_fees_v2 just grabbed whichever `fees` row
-- was created most recently, with no period awareness at all.
-- Whenever a student has more than one period's fee row, the two
-- can disagree.
--
-- RESULTS: migration 014_separate_parent_release.sql added
-- exams.released_to_parents specifically so schools could finish
-- grading (status = 'published') without immediately showing
-- parents anything, then click "Post to Parents" (Settings.jsx,
-- handleReleaseToggle) when ready. That's the only release control
-- an admin can actually see and click today. But the July 16
-- rewrite of portal_get_student_results_v2 (20260716_portal_
-- security_and_rendering_fixes.sql) checks e.status ILIKE
-- 'published' instead -- released_to_parents is never read here.
-- Clicking "Post to Parents" currently has no effect on what this
-- function returns. This is a regression, not a design choice --
-- restoring the released_to_parents check is the fix.
--
-- NOTE: there is a THIRD mechanism for the same concept --
-- exam_publish_settings.results_released_to_parents, keyed by
-- exam_session_id (see releaseResultsToParents() in
-- academicsStore.js). That table isn't touched here because
-- which of the two (exams.released_to_parents vs. exam_session-
-- based publish settings) is the one you actually want going
-- forward is a product call, not something to guess in a bugfix
-- migration -- see the accompanying note for the two options.
-- ============================================================

-- ---------- FEES: make the portal RPCs period-aware ----------

DROP FUNCTION IF EXISTS public.portal_get_student_fee_summary(uuid, uuid);
CREATE OR REPLACE FUNCTION public.portal_get_student_fee_summary(p_student_id uuid, p_school_id uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_active_period_id UUID;
    v_fee RECORD;
    v_payments JSONB;
BEGIN
    -- Resolve the same "current period" the admin dashboard uses
    -- (academic_periods.is_active), instead of just taking
    -- whichever fees row happens to have the newest created_at.
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
    ORDER BY created_at DESC NULLS LAST
    LIMIT 1;

    IF v_fee IS NULL THEN
        -- Honest "nothing set up for the current term yet" response
        -- instead of silently falling back to a stale prior-term row.
        RETURN jsonb_build_object(
            'total_fee', 0, 'paid', 0, 'balance', 0, 'payments', '[]'::jsonb,
            'period_id', v_active_period_id, 'no_record_for_current_period', true
        );
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', fp.id, 'amount', fp.amount, 'date', fp.date,
            'method', COALESCE(fp.method, 'Payment'), 'reference', COALESCE(fp.reference, ''),
            'status', COALESCE(fp.status, 'Confirmed')
        ) ORDER BY fp.date DESC
    ), '[]'::jsonb)
    INTO v_payments
    FROM public.fee_payments fp
    WHERE fp.fee_id = v_fee.id AND COALESCE(fp.status, 'Confirmed') != 'Voided';

    RETURN jsonb_build_object(
        'total_fee', COALESCE(v_fee.total_fee, 0), 'paid', COALESCE(v_fee.paid, 0),
        'balance', COALESCE(v_fee.balance, 0), 'fee_id', v_fee.id,
        'period_id', v_fee.period_id, 'payments', v_payments,
        'no_record_for_current_period', false
    );
END;
$func$;

DROP FUNCTION IF EXISTS public.portal_get_student_fees_v2(uuid, uuid);
CREATE OR REPLACE FUNCTION public.portal_get_student_fees_v2(p_student_id uuid, p_school_id uuid)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_active_period_id UUID;
BEGIN
    SELECT id INTO v_active_period_id FROM public.academic_periods
    WHERE school_id = p_school_id AND is_active = true LIMIT 1;

    RETURN (
        SELECT jsonb_build_object('id', id, 'total_fee', total_fee, 'paid', paid, 'balance', balance, 'period_id', period_id)
        FROM public.fees
        WHERE student_id = p_student_id AND school_id = p_school_id
          AND (v_active_period_id IS NULL OR period_id = v_active_period_id)
        ORDER BY created_at DESC NULLS LAST LIMIT 1
    );
END;
$$;

-- ---------- RESULTS: gate on released_to_parents, not status ----------

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
    -- Strategy 1: structured exam_results table, gated on the flag
    -- the "Post to Parents" button in Settings.jsx actually sets.
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', er.id,
            'exam_id', er.exam_id,
            'student_id', er.student_id,
            'total_marks', er.total_marks,
            'mean_score', er.mean_score,
            'class_position', er.class_position,
            'stream_position', er.stream_position,
            'class_size', er.class_size,
            'stream_size', er.stream_size,
            'exam_name', e.name,
            'exam_term', e.term,
            'exam_type', e.exam_type
        ) ORDER BY e.created_at DESC
    ), '[]'::jsonb)
    INTO v_results
    FROM public.exam_results er
    JOIN public.exams e ON er.exam_id = e.id
    WHERE er.student_id = p_student_id
      AND e.school_id = p_school_id
      AND e.released_to_parents = TRUE;

    -- Strategy 2: fallback to aggregating the marks table directly,
    -- for schools/exams that never get a matching exam_results row.
    -- Same released_to_parents gate applies.
    IF jsonb_array_length(v_results) = 0 THEN
        SELECT COALESCE(jsonb_agg(exam_row ORDER BY exam_row->>'exam_type'), '[]'::jsonb)
        INTO v_results
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
                    jsonb_build_object('subject', m.subject, 'mark', m.mark) ORDER BY m.subject
                )
            ) AS exam_row
            FROM public.marks m
            JOIN public.exams e2 ON e2.exam_type = m.exam_type AND e2.school_id = m.school_id
            WHERE m.student_id = p_student_id
              AND m.school_id = p_school_id
              AND m.mark IS NOT NULL
              AND e2.released_to_parents = TRUE
            GROUP BY m.exam_type, m.school_id
        ) sub;
    END IF;

    RETURN v_results;
END;
$$;
