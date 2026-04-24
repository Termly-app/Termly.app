-- ============================================================
-- MISSING PRODUCTION TABLES & TRIGGERS (M-PESA, SMS, AUDIT)
-- Covers Domains 6, 13, 14
-- ============================================================

-- 1. SMS Logs Table (Domain 14)
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    provider TEXT DEFAULT 'africastalking',
    message_id TEXT,
    cost DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sms_logs_school ON public.sms_logs(school_id);

DROP POLICY IF EXISTS "Admins read school sms logs" ON public.sms_logs;
CREATE POLICY "Admins read school sms logs" ON public.sms_logs
    FOR SELECT USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());

-- 2. M-Pesa Transactions (STK Push State Tracking)
CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    checkout_request_id TEXT UNIQUE NOT NULL,
    merchant_request_id TEXT,
    phone TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, success, failed, cancelled
    result_desc TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_mpesa_checkout ON public.mpesa_transactions(checkout_request_id);

DROP POLICY IF EXISTS "Admins read mpesa transactions" ON public.mpesa_transactions;
CREATE POLICY "Admins read mpesa transactions" ON public.mpesa_transactions
    FOR SELECT USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());

-- 3. Payment Logs (Atomic Ledger for all payment attempts)
CREATE TABLE IF NOT EXISTS public.payment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id),
    amount DECIMAL(10,2) NOT NULL,
    method TEXT NOT NULL, -- mpesa, cash, bank, scholarship
    reference TEXT,
    status TEXT DEFAULT 'completed',
    raw_response JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_payment_logs_school ON public.payment_logs(school_id);

DROP POLICY IF EXISTS "Admins read payment logs" ON public.payment_logs;
CREATE POLICY "Admins read payment logs" ON public.payment_logs
    FOR SELECT USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());

-- 4. Unified Audit Logging Trigger (Domain 6)
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_school_id UUID;
    v_actor_id UUID;
    v_metadata JSONB;
BEGIN
    -- Resolve school_id (handle different table structures)
    BEGIN
        v_school_id := COALESCE(NEW.school_id, (auth.jwt() ->> 'school_id')::uuid);
    EXCEPTION WHEN OTHERS THEN
        v_school_id := (auth.jwt() ->> 'school_id')::uuid;
    END;

    v_actor_id := auth.uid();
    
    -- Capture changes for UPDATE
    IF (TG_OP = 'UPDATE') THEN
        v_metadata := jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        );
    ELSE
        v_metadata := to_jsonb(NEW);
    END IF;

    INSERT INTO public.audit_logs (
        school_id,
        actor_id,
        action,
        target_table,
        target_id,
        metadata,
        ip_address
    ) VALUES (
        v_school_id,
        v_actor_id,
        TG_OP, -- INSERT, UPDATE, DELETE
        TG_TABLE_NAME,
        NEW.id,
        v_metadata,
        inet_client_addr()::text
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Audit Triggers to Critical Tables
DO $$ 
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['fee_payments', 'exam_marks', 'students', 'exams', 'users']) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_audit_%I ON public.%I', t, t);
        EXECUTE format('CREATE TRIGGER tr_audit_%I AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_activity()', t, t);
    END LOOP;
END $$;
