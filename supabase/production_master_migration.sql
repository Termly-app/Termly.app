-- ============================================================
-- SHULESOFT PRODUCTION MASTER MIGRATION (CONSOLIDATED)
-- Covers All Domains 1-17: RBAC, Multi-tenancy, Fees, SMS, Audit, Exams
-- Run in Supabase SQL Editor. Safe to run multiple times.
-- ============================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. DOMAIN 1 & 17: SCHOOLS & INFRASTRUCTURE
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS is_platform_account BOOLEAN DEFAULT false;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'Sandbox';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT false;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS sms_balance DECIMAL(10,2) DEFAULT 0.00;

-- 3. DOMAIN 6 & 13: AUDIT LOGS & ACTIVITY TABLES
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    actor_id UUID,
    actor_email TEXT,
    actor_role TEXT,
    action TEXT NOT NULL, -- INSERT, UPDATE, DELETE, LOGIN, etc.
    target_table TEXT,
    target_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Immutability for Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Audit logs are read-only" ON public.audit_logs FOR SELECT USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());
    CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.portal_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    actor_type TEXT CHECK (actor_type IN ('parent', 'teacher', 'student')),
    actor_name TEXT,
    actor_id UUID,
    action TEXT NOT NULL,
    target_type TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DOMAIN 13 & 4: M-PESA & PAYMENTS
CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    checkout_request_id TEXT UNIQUE NOT NULL,
    merchant_request_id TEXT,
    phone TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    result_desc TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure unique M-PESA code per school in fee_payments
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);
DROP INDEX IF EXISTS idx_unique_mpesa_per_school;
CREATE UNIQUE INDEX idx_unique_mpesa_per_school ON public.fee_payments (reference, school_id) WHERE reference IS NOT NULL AND reference != '';

-- 5. DOMAIN 14: SMS & NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    cost DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    recipient_id UUID,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. DOMAIN 12: EXAM ENTRY GATING
CREATE TABLE IF NOT EXISTS public.exam_publish_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    exam_id UUID UNIQUE,
    teacher_entry_open BOOLEAN DEFAULT true,
    results_released_to_parents BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. DOMAIN 6: AUTOMATED AUDIT TRIGGER
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_school_id UUID;
BEGIN
    BEGIN
        v_school_id := COALESCE(NEW.school_id, (auth.jwt() ->> 'school_id')::uuid);
    EXCEPTION WHEN OTHERS THEN
        v_school_id := (auth.jwt() ->> 'school_id')::uuid;
    END;

    INSERT INTO public.audit_logs (
        school_id, actor_id, actor_email, action, target_table, target_id, metadata, ip_address
    ) VALUES (
        v_school_id, auth.uid(), auth.jwt() ->> 'email', TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(NEW), inet_client_addr()::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers to critical tables
DO $$ 
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['fee_payments', 'exam_marks', 'students', 'exams', 'users']) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_audit_%I ON public.%I', t, t);
        EXECUTE format('CREATE TRIGGER tr_audit_%I AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_activity()', t, t);
    END LOOP;
END $$;

-- 8. HELPER: is_platform_admin function
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT is_platform_account 
        FROM public.schools 
        WHERE id = (auth.jwt() ->> 'school_id')::uuid
    ) IS TRUE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 9. RLS HARDENING (Example: Students)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "School users access own students" ON public.students;
CREATE POLICY "School users access own students" ON public.students
    FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());

-- Refresh Schema
NOTIFY pgrst, 'reload schema';
