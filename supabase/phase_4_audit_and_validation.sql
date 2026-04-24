-- ============================================================
-- PHASE 4: AUDIT LOGGING + VALIDATION CONSTRAINTS
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    actor_id UUID,
    action_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_school_id ON public.audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 2. Trigger Function (handles tables with or without school_id)
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_school_id UUID;
    v_actor_id UUID;
    v_record_id UUID;
BEGIN
    -- Safely resolve school_id (some tables like exam_results don't have it)
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            v_school_id := OLD.school_id;
        ELSE
            v_school_id := NEW.school_id;
        END IF;
    EXCEPTION WHEN undefined_column THEN
        v_school_id := NULL;
    END;

    -- Safely resolve record id
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            v_record_id := OLD.id;
        ELSE
            v_record_id := NEW.id;
        END IF;
    EXCEPTION WHEN undefined_column THEN
        v_record_id := NULL;
    END;

    -- Resolve actor from JWT
    BEGIN
        v_actor_id := (auth.jwt() ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
        v_actor_id := NULL;
    END;

    INSERT INTO public.audit_logs (
        school_id, actor_id, action_type, table_name, record_id, old_data, new_data
    ) VALUES (
        v_school_id,
        v_actor_id,
        TG_OP,
        TG_TABLE_NAME,
        v_record_id,
        CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply to critical tables
DROP TRIGGER IF EXISTS tr_audit_exams ON public.exams;
CREATE TRIGGER tr_audit_exams AFTER INSERT OR UPDATE OR DELETE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS tr_audit_exam_results ON public.exam_results;
CREATE TRIGGER tr_audit_exam_results AFTER INSERT OR UPDATE OR DELETE ON public.exam_results FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS tr_audit_fees ON public.fees;
CREATE TRIGGER tr_audit_fees AFTER INSERT OR UPDATE OR DELETE ON public.fees FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS tr_audit_fee_payments ON public.fee_payments;
CREATE TRIGGER tr_audit_fee_payments AFTER INSERT OR UPDATE OR DELETE ON public.fee_payments FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS tr_audit_students ON public.students;
CREATE TRIGGER tr_audit_students AFTER INSERT OR UPDATE OR DELETE ON public.students FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS tr_audit_exam_marks ON public.exam_marks;
CREATE TRIGGER tr_audit_exam_marks AFTER INSERT OR UPDATE OR DELETE ON public.exam_marks FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- 4. RLS for Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School admins can read their own audit logs" ON public.audit_logs;
CREATE POLICY "School admins can read their own audit logs"
ON public.audit_logs
FOR SELECT
USING (
    school_id = (auth.jwt() ->> 'school_id')::uuid 
    AND (auth.jwt() ->> 'role') = 'admin'
);

DROP POLICY IF EXISTS "Platform admins can read all audit logs" ON public.audit_logs;
CREATE POLICY "Platform admins can read all audit logs"
ON public.audit_logs
FOR SELECT
USING (public.is_platform_admin());

-- 5. Input Validation Constraints
-- Ensure M-PESA transaction codes follow the correct format
DO $$ BEGIN
    ALTER TABLE public.fee_payments ADD CONSTRAINT chk_mpesa_reference
        CHECK (method != 'M-PESA' OR reference ~ '^[A-Z0-9]{10}$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ensure marks are in valid range (0-100)
DO $$ BEGIN
    ALTER TABLE public.exam_marks ADD CONSTRAINT chk_marks_range
        CHECK (raw_score >= 0 AND raw_score <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- NOTE: Phone format validation is enforced on the frontend via validators.js
-- Existing data contains non-standard phone formats, so no DB constraint is applied.

NOTIFY pgrst, 'reload schema';
