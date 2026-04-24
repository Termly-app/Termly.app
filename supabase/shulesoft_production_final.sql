-- ============================================================
-- SHULESOFT PRODUCTION MASTER SETUP (FINAL)
-- Focus: Multi-tenancy, RBAC, M-Pesa, SMS, and Audit Compliance
-- ============================================================

-- 1. SECURITY & RBAC HELPERS
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

-- 2. AUDIT LOGGING INFRASTRUCTURE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_email TEXT,
    actor_role TEXT,
    action TEXT NOT NULL,
    target_table TEXT,
    target_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users read own school logs" ON public.audit_logs
        FOR SELECT USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Automated Audit Trigger
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_school_id UUID;
BEGIN
    v_school_id := COALESCE(NEW.school_id, (auth.jwt() ->> 'school_id')::uuid);
    
    INSERT INTO public.audit_logs (
        school_id, actor_id, actor_email, actor_role, action, target_table, target_id, metadata
    ) VALUES (
        v_school_id, auth.uid(), auth.jwt() ->> 'email', auth.jwt() ->> 'role', TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(NEW)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. M-PESA & SMS INFRASTRUCTURE
CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    checkout_request_id TEXT UNIQUE NOT NULL,
    merchant_request_id TEXT,
    phone TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, success, failed
    result_desc TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "School users access own transactions" ON public.mpesa_transactions
        FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    cost DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "School users access own sms logs" ON public.sms_logs
        FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. MULTI-TENANCY RLS ENFORCEMENT
-- Apply this pattern to all tables
DO $$ 
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
             AND tablename NOT IN ('schools', 'audit_logs', 'schema_migrations') LOOP
        
        -- Only apply Tenant Isolation if the table has a school_id column
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'school_id') THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON public.%I', t);
            EXECUTE format('CREATE POLICY "Tenant Isolation" ON public.%I FOR ALL USING (school_id = (auth.jwt() ->> ''school_id'')::uuid OR public.is_platform_admin())', t);
        END IF;
        
        -- Attach audit trigger to critical tables
        IF t IN ('students', 'fee_payments', 'exams', 'users') THEN
            EXECUTE format('DROP TRIGGER IF EXISTS tr_audit_%I ON public.%I', t, t);
            EXECUTE format('CREATE TRIGGER tr_audit_%I AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_activity()', t, t);
        END IF;
    END LOOP;
END $$;

-- 5. UNIQUE CONSTRAINTS
-- Ensure M-Pesa reference is unique per school to prevent double entry
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);
DROP INDEX IF EXISTS uq_mpesa_code_per_school;
CREATE UNIQUE INDEX uq_mpesa_code_per_school ON public.fee_payments (reference, school_id) 
WHERE reference IS NOT NULL AND reference != '';

-- 6. SCHEMA RELOAD
NOTIFY pgrst, 'reload schema';
