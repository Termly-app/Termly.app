-- Domain 3: Multi-tenant Audit Logging
-- This script implements a central audit logging system for all school actions.

-- 1. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_school_id ON public.audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 2. Trigger Function
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_school_id UUID;
    v_actor_id UUID;
BEGIN
    -- Resolve school_id from the record (assuming all audited tables have school_id)
    IF (TG_OP = 'DELETE') THEN
        v_school_id := OLD.school_id;
    ELSE
        v_school_id := NEW.school_id;
    END IF;

    -- Resolve actor_id from JWT
    BEGIN
        v_actor_id := (auth.jwt() ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
        v_actor_id := NULL;
    END;

    -- Log the change
    INSERT INTO public.audit_logs (
        school_id, actor_id, action_type, table_name, record_id, old_data, new_data
    ) VALUES (
        v_school_id,
        v_actor_id,
        TG_OP,
        TG_TABLE_NAME,
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)::jsonb ELSE NULL END
    );

    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply Triggers to Critical Tables
-- Exams
DROP TRIGGER IF EXISTS tr_audit_exams ON public.exams;
CREATE TRIGGER tr_audit_exams AFTER INSERT OR UPDATE OR DELETE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- Exam Results (Marks)
DROP TRIGGER IF EXISTS tr_audit_exam_results ON public.exam_results;
CREATE TRIGGER tr_audit_exam_results AFTER INSERT OR UPDATE OR DELETE ON public.exam_results FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- Fees
DROP TRIGGER IF EXISTS tr_audit_fees ON public.fees;
CREATE TRIGGER tr_audit_fees AFTER INSERT OR UPDATE OR DELETE ON public.fees FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- Fee Payments
DROP TRIGGER IF EXISTS tr_audit_fee_payments ON public.fee_payments;
CREATE TRIGGER tr_audit_fee_payments AFTER INSERT OR UPDATE OR DELETE ON public.fee_payments FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- Students
DROP TRIGGER IF EXISTS tr_audit_students ON public.students;
CREATE TRIGGER tr_audit_students AFTER INSERT OR UPDATE OR DELETE ON public.students FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- 4. RLS for Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School admins can read their own audit logs"
ON public.audit_logs
FOR SELECT
USING (
    school_id = (auth.jwt() ->> 'school_id')::uuid 
    AND (
        (auth.jwt() ->> 'role')::text = 'Admin'
        OR (auth.jwt() ->> 'role')::text = 'SuperAdmin'
    )
);

CREATE POLICY "Platform admins can read all audit logs"
ON public.audit_logs
FOR SELECT
USING (public.is_platform_admin());
