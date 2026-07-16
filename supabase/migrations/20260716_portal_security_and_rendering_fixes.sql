-- ============================================================
-- 20260716_PORTAL_SECURITY_AND_RENDERING_FIXES.SQL
-- Fixes critical portal security issues and missing results.
-- 1. Remove 1234 PIN bypass.
-- 2. Scopes all parent RPCs by school_id.
-- 3. Unifies student results to fallback to marks table.
-- ============================================================

-- 1. FIX PARENT LOGIN BYPASS
CREATE OR REPLACE FUNCTION public.validate_parent_portal_login(p_school_search TEXT, p_adm_no TEXT, p_phone TEXT)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_school_id UUID; 
  v_student RECORD; 
  v_parent_phone_clean TEXT; 
  v_input_phone_clean TEXT;
  v_class_id UUID;
BEGIN
  SELECT id INTO v_school_id FROM public.schools 
  WHERE id::text = p_school_search OR school_code ILIKE p_school_search 
    OR name ILIKE '%' || p_school_search || '%' 
    OR email ILIKE '%' || p_school_search || '%'
  LIMIT 1;
  IF v_school_id IS NULL THEN RETURN jsonb_build_object('error', 'Institution not found.'); END IF;
  
  SELECT id, name, class, stream, subjects, adm_no, school_id, parent_phone, residence_type, status 
  INTO v_student FROM public.students 
  WHERE school_id = v_school_id AND adm_no ILIKE p_adm_no LIMIT 1;
  IF v_student.id IS NULL THEN RETURN jsonb_build_object('error', 'Student not found.'); END IF;

  IF v_student.status = 'Inactive' OR v_student.status = 'Graduated' OR v_student.status = 'Transferred' THEN
    RETURN jsonb_build_object('error', 'Access restricted. This account is marked as ' || COALESCE(v_student.status, 'inactive') || '.');
  END IF;
  
  -- Attempt to get the class_id from the classes table
  SELECT id INTO v_class_id FROM public.classes WHERE school_id = v_school_id AND name = v_student.class LIMIT 1;
  
  v_parent_phone_clean := REGEXP_REPLACE(COALESCE(v_student.parent_phone, ''), '[^0-9]', '', 'g');
  v_input_phone_clean := REGEXP_REPLACE(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
  
  -- REMOVED 1234 BYPASS HERE
  IF v_parent_phone_clean != v_input_phone_clean THEN 
    RETURN jsonb_build_object('error', 'Phone check failed. Guardian phone does not match our records.'); 
  END IF;
  
  RETURN jsonb_build_object(
    'id', v_student.id, 
    'name', v_student.name, 
    'class', v_student.class, 
    'stream', COALESCE(v_student.stream, ''),
    'subjects', COALESCE(v_student.subjects, '[]'::jsonb),
    'class_id', v_class_id, 
    'adm_no', v_student.adm_no, 
    'school_id', v_student.school_id, 
    'residence_type', COALESCE(v_student.residence_type, 'day'),
    'parent_phone', COALESCE(v_student.parent_phone, '')
  );
EXCEPTION WHEN OTHERS THEN 
  RETURN jsonb_build_object('error', 'DB Error: ' || SQLERRM);
END; 
$$;

-- 2. FIX STUDENT RESULTS (Add school_id scope + fallback to marks)
DROP FUNCTION IF EXISTS public.portal_get_student_results_v2(uuid);
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
    -- Strategy 1: Check structured exam_results table first
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
      AND e.status ILIKE 'published';

    -- Strategy 2: If no structured results, fallback to aggregating marks table
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
                    jsonb_build_object(
                        'subject', m.subject,
                        'mark', m.mark
                    ) ORDER BY m.subject
                )
            ) AS exam_row
            FROM public.marks m
            WHERE m.student_id = p_student_id
              AND m.school_id = p_school_id
              AND m.mark IS NOT NULL
            GROUP BY m.exam_type, m.school_id
        ) sub;
    END IF;

    RETURN v_results;
END;
$$;

-- 3. FIX SUBJECT DETAILS (Scope to student's actual subjects)
DROP FUNCTION IF EXISTS public.portal_get_subject_details(uuid);
DROP FUNCTION IF EXISTS public.portal_get_subject_details(uuid, uuid);

CREATE OR REPLACE FUNCTION public.portal_get_subject_details(p_student_id uuid, p_school_id uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_subjects JSONB;
BEGIN
    -- Get subjects array from student record
    SELECT subjects INTO v_student_subjects 
    FROM public.students 
    WHERE id = p_student_id AND school_id = p_school_id;

    -- Return full details from tt_subjects, filtering by the student's subjects array
    -- if it exists, otherwise return subjects where the student has marks
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', sub.id,
                'name', sub.name,
                'code', sub.short_code
            )
        ), '[]'::jsonb)
        FROM public.tt_subjects sub
        WHERE sub.school_id = p_school_id
          AND (
            (v_student_subjects IS NOT NULL AND jsonb_array_length(v_student_subjects) > 0 AND v_student_subjects ? sub.name)
            OR
            EXISTS (SELECT 1 FROM public.marks m WHERE m.student_id = p_student_id AND m.subject = sub.name)
          )
    );
END;
$$;

-- 4. FIX STUDENTS BY CLASS NAME (Filter inactive)
CREATE OR REPLACE FUNCTION public.portal_get_students_by_class_name(p_school_id uuid, p_class_name text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'adm_no', s.adm_no,
            'class', s.class,
            'stream', s.stream,
            'admNo', s.adm_no
        ) ORDER BY s.name ASC), '[]'::jsonb)
        FROM public.students s
        WHERE s.school_id = p_school_id
          AND s.class = p_class_name
          AND (s.status IS NULL OR s.status NOT IN ('Inactive', 'Graduated', 'Transferred'))
    );
END;
$$;

-- 5. UPDATE OTHER RPCS TO ADD SCHOOL_ID SCOPING
DROP FUNCTION IF EXISTS public.portal_get_student_fee_summary(uuid);
DROP FUNCTION IF EXISTS public.portal_get_student_fee_summary(uuid, uuid);
CREATE OR REPLACE FUNCTION public.portal_get_student_fee_summary(p_student_id uuid, p_school_id uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_fee RECORD;
    v_payments JSONB;
BEGIN
    SELECT id, total_fee, paid, balance, period_id
    INTO v_fee
    FROM public.fees
    WHERE student_id = p_student_id AND school_id = p_school_id
    ORDER BY created_at DESC NULLS LAST
    LIMIT 1;

    IF v_fee IS NULL THEN
        RETURN jsonb_build_object('total_fee', 0, 'paid', 0, 'balance', 0, 'payments', '[]'::jsonb);
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
        'period_id', v_fee.period_id, 'payments', v_payments
    );
END;
$func$;

DROP FUNCTION IF EXISTS public.portal_get_student_fees_v2(uuid);
DROP FUNCTION IF EXISTS public.portal_get_student_fees_v2(uuid, uuid);
CREATE OR REPLACE FUNCTION public.portal_get_student_fees_v2(p_student_id uuid, p_school_id uuid)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN (
        SELECT jsonb_build_object('id', id, 'total_fee', total_fee, 'paid', paid, 'balance', balance)
        FROM public.fees
        WHERE student_id = p_student_id AND school_id = p_school_id
        ORDER BY created_at DESC NULLS LAST LIMIT 1
    );
END;
$$;

DROP FUNCTION IF EXISTS public.portal_get_student_payments_v2(uuid);
DROP FUNCTION IF EXISTS public.portal_get_student_payments_v2(uuid, uuid);
CREATE OR REPLACE FUNCTION public.portal_get_student_payments_v2(p_student_id uuid, p_school_id uuid)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('id', fp.id, 'amount', fp.amount, 'date', fp.date, 'method', fp.method, 'reference', fp.reference)), '[]'::jsonb)
        FROM public.fee_payments fp
        JOIN public.fees f ON f.id = fp.fee_id
        WHERE f.student_id = p_student_id AND f.school_id = p_school_id
        ORDER BY fp.date DESC
    );
END;
$$;

DROP FUNCTION IF EXISTS public.portal_get_student_profile(uuid);
DROP FUNCTION IF EXISTS public.portal_get_student_profile(uuid, uuid);
CREATE OR REPLACE FUNCTION public.portal_get_student_profile(p_student_id uuid, p_school_id uuid)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN (
        SELECT jsonb_build_object('id', id, 'name', name, 'adm_no', adm_no, 'class', class, 'stream', stream, 'gender', gender, 'parent', parent, 'parent_phone', parent_phone, 'parent_name', parent)
        FROM public.students
        WHERE id = p_student_id AND school_id = p_school_id
    );
END;
$$;

DROP FUNCTION IF EXISTS public.portal_get_student_subjects(uuid);
DROP FUNCTION IF EXISTS public.portal_get_student_subjects(uuid, uuid);
CREATE OR REPLACE FUNCTION public.portal_get_student_subjects(p_student_id uuid, p_school_id uuid)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_subjects JSONB;
BEGIN
    SELECT subjects INTO v_subjects FROM public.students WHERE id = p_student_id AND school_id = p_school_id;
    IF v_subjects IS NOT NULL AND jsonb_array_length(v_subjects) > 0 THEN RETURN v_subjects; END IF;
    RETURN (SELECT COALESCE(jsonb_agg(DISTINCT m.subject ORDER BY m.subject), '[]'::jsonb) FROM public.marks m WHERE m.student_id = p_student_id AND m.school_id = p_school_id AND m.subject IS NOT NULL);
END;
$$;
