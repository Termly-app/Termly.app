-- ============================================================
-- MASTER PROMPT GAP-FILL MIGRATION
-- Covers all missing DB items from Domains 1-17
-- Run in Supabase SQL Editor — safe to run multiple times
-- ============================================================

-- ============================================================
-- PART 1: MISSING TABLE COLUMNS & CONSTRAINTS
-- ============================================================

-- Domain 1: Ensure is_platform_account exists
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS is_platform_account BOOLEAN DEFAULT false;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Domain 4: Payment amount constraint
DO $$ BEGIN
    ALTER TABLE public.fee_payments ADD CONSTRAINT chk_payment_amount
        CHECK (amount > 0 AND amount < 1000000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Domain 4: Unique M-PESA code per school (THE critical financial integrity guard)
-- fee_payments may not have school_id directly, so we add it if missing
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

-- Partial unique index: prevents duplicate M-PESA codes per school
-- but allows multiple rows with empty/null reference (cash payments, etc.)
DROP INDEX IF EXISTS idx_unique_mpesa_per_school;
CREATE UNIQUE INDEX idx_unique_mpesa_per_school
    ON public.fee_payments (reference, school_id)
    WHERE reference IS NOT NULL AND reference != '';

-- Domain 4: Student admission number constraints
DO $$ BEGIN
    ALTER TABLE public.students ADD CONSTRAINT chk_student_name_not_empty
        CHECK (length(trim(name)) > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.students ADD CONSTRAINT chk_adm_no_not_empty
        CHECK (adm_no IS NOT NULL AND length(trim(adm_no)) > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- PART 2: NOTIFICATIONS TABLE (Domain 14C)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    recipient_id UUID,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_school ON public.notifications(school_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read) WHERE read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
CREATE POLICY "Users see own notifications" ON public.notifications
    FOR SELECT USING (
        recipient_id = (auth.jwt() ->> 'sub')::uuid
        OR public.is_platform_admin()
    );

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (recipient_id = (auth.jwt() ->> 'sub')::uuid)
    WITH CHECK (recipient_id = (auth.jwt() ->> 'sub')::uuid);

DROP POLICY IF EXISTS "School admins can insert notifications" ON public.notifications;
CREATE POLICY "School admins can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (
        school_id = (auth.jwt() ->> 'school_id')::uuid
        OR public.is_platform_admin()
    );

-- ============================================================
-- PART 3: PORTAL ACTIVITY LOG (Domain 13D)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.portal_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('parent', 'teacher', 'student')),
    actor_name TEXT,
    actor_id UUID,
    action TEXT NOT NULL,
    target_type TEXT,
    target_name TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_activity_school ON public.portal_activity_log(school_id);
CREATE INDEX IF NOT EXISTS idx_portal_activity_created ON public.portal_activity_log(created_at);

ALTER TABLE public.portal_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School admins read portal activity" ON public.portal_activity_log;
CREATE POLICY "School admins read portal activity" ON public.portal_activity_log
    FOR SELECT USING (
        school_id = (auth.jwt() ->> 'school_id')::uuid
        OR public.is_platform_admin()
    );

DROP POLICY IF EXISTS "Portal users can insert activity" ON public.portal_activity_log;
CREATE POLICY "Portal users can insert activity" ON public.portal_activity_log
    FOR INSERT WITH CHECK (true);

-- Auto-purge rows older than 90 days (run via pg_cron if available)
-- SELECT cron.schedule('purge-portal-activity', '0 3 * * *', $$DELETE FROM public.portal_activity_log WHERE created_at < NOW() - INTERVAL '90 days'$$);

-- ============================================================
-- PART 4: ENHANCED AUDIT_LOGS (Domain 6 gaps)
-- ============================================================

-- Add missing columns to audit_logs for full Domain 6 compliance
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_email TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_role TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_table TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_id UUID;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Create the action enum type if needed (using text for flexibility)
COMMENT ON COLUMN public.audit_logs.action IS 'One of: login, logout, student_created, student_updated, student_deleted, payment_recorded, payment_approved, payment_rejected, mark_entered, mark_updated, exam_published, exam_unpublished, teacher_entry_opened, teacher_entry_closed, results_released_to_parents, results_retracted, plan_activated, plan_deactivated, password_reset, shadow_mode_entered, shadow_mode_exited, nemis_exported, report_generated, portal_token_created, portal_token_revoked, bulk_student_import_completed, class_promoted, teacher_assigned, teacher_reassigned, subscription_reminder_sent';

-- Immutability: No UPDATE or DELETE on audit_logs for non-platform-admins
DROP POLICY IF EXISTS "No one can update audit logs" ON public.audit_logs;
CREATE POLICY "No one can update audit logs" ON public.audit_logs
    FOR UPDATE USING (false);

DROP POLICY IF EXISTS "No one can delete audit logs" ON public.audit_logs;
CREATE POLICY "No one can delete audit logs" ON public.audit_logs
    FOR DELETE USING (false);

-- Allow inserts from authenticated users
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- PART 5: MISSING RLS POLICIES (Domain 1 gaps)
-- Each block is wrapped in DO/EXCEPTION to safely skip
-- tables that don't exist in your database yet.
-- ============================================================

-- teacher_assignments RLS
DO $$ BEGIN
    ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "School users access teacher_assignments" ON public.teacher_assignments;
    CREATE POLICY "School users access teacher_assignments" ON public.teacher_assignments
        FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- class_streams RLS
DO $$ BEGIN
    ALTER TABLE public.class_streams ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "School users access class_streams" ON public.class_streams;
    CREATE POLICY "School users access class_streams" ON public.class_streams
        FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- subject_configurations RLS
DO $$ BEGIN
    ALTER TABLE public.subject_configurations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "School users access subject_configurations" ON public.subject_configurations;
    CREATE POLICY "School users access subject_configurations" ON public.subject_configurations
        FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- portal_users RLS
DO $$ BEGIN
    ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Portal users read own row" ON public.portal_users;
    CREATE POLICY "Portal users read own row" ON public.portal_users
        FOR SELECT USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());
    DROP POLICY IF EXISTS "School admins manage portal users" ON public.portal_users;
    CREATE POLICY "School admins manage portal users" ON public.portal_users
        FOR ALL USING ((school_id = (auth.jwt() ->> 'school_id')::uuid AND (auth.jwt() ->> 'role') = 'Admin') OR public.is_platform_admin());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped portal_users RLS: %', SQLERRM;
END $$;

-- exam_publish_settings RLS
DO $$ BEGIN
    ALTER TABLE public.exam_publish_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "School users access exam_publish_settings" ON public.exam_publish_settings;
    CREATE POLICY "School users access exam_publish_settings" ON public.exam_publish_settings
        FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- academic_periods RLS
DO $$ BEGIN
    ALTER TABLE public.academic_periods ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "School users access academic_periods" ON public.academic_periods;
    CREATE POLICY "School users access academic_periods" ON public.academic_periods
        FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- users table RLS
DO $$ BEGIN
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "School users access own school users" ON public.users;
    CREATE POLICY "School users access own school users" ON public.users
        FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR auth_user_id = auth.uid() OR public.is_platform_admin());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- exams RLS
DO $$ BEGIN
    ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "School users access own exams" ON public.exams;
    CREATE POLICY "School users access own exams" ON public.exams
        FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- exam_marks RLS
DO $$ BEGIN
    ALTER TABLE public.exam_marks ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "School users access own exam_marks" ON public.exam_marks;
    CREATE POLICY "School users access own exam_marks" ON public.exam_marks
        FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- books RLS
DO $$ BEGIN
    ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "School users access own books" ON public.books;
    CREATE POLICY "School users access own books" ON public.books
        FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- book_copies RLS
DO $$ BEGIN
    ALTER TABLE public.book_copies ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "School users access own book_copies" ON public.book_copies;
    CREATE POLICY "School users access own book_copies" ON public.book_copies
        FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- borrow_records RLS
DO $$ BEGIN
    ALTER TABLE public.borrow_records ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "School users access own borrow_records" ON public.borrow_records;
    CREATE POLICY "School users access own borrow_records" ON public.borrow_records
        FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- announcements RLS
DO $$ BEGIN
    ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "School users access own announcements" ON public.announcements;
    CREATE POLICY "School users access own announcements" ON public.announcements
        FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- messages RLS
DO $$ BEGIN
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "School users access own messages" ON public.messages;
    CREATE POLICY "School users access own messages" ON public.messages
        FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;    
END $$;

-- payments (platform-level) RLS
DO $$ BEGIN
    ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "School users access own payments" ON public.payments;
    CREATE POLICY "School users access own payments" ON public.payments
        FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- ============================================================
-- PART 6: DB TRIGGERS FOR DOMAIN 12 (exam entry gating)
-- ============================================================

-- Trigger: Block marks from teacher portal if teacher_entry_open = false
CREATE OR REPLACE FUNCTION public.check_teacher_entry_permission()
RETURNS TRIGGER AS $$
DECLARE
    v_entry_open BOOLEAN;
BEGIN
    -- Only enforce on teacher portal entries
    IF NEW.entry_source = 'teacher_portal' THEN
        SELECT teacher_entry_open INTO v_entry_open
        FROM public.exam_publish_settings
        WHERE exam_id = NEW.exam_id
          AND school_id = NEW.school_id
        LIMIT 1;

        IF v_entry_open IS NOT TRUE THEN
            RAISE EXCEPTION 'Teacher mark entry is currently closed for this exam. Contact your admin.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS tr_check_teacher_entry ON public.exam_marks;
    CREATE TRIGGER tr_check_teacher_entry
        BEFORE INSERT OR UPDATE ON public.exam_marks
        FOR EACH ROW
        EXECUTE FUNCTION public.check_teacher_entry_permission();
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- Trigger: Block parent portal from reading marks when results not released
-- (This is enforced via RLS policy instead for better performance)
-- Parents can only see marks where results_released_to_parents = true
-- This is handled by the portal RPC functions which filter accordingly.

-- ============================================================
-- PART 7: NOTIFICATION TRIGGERS (Domain 14C)
-- ============================================================

-- Trigger: Create notification when a payment needs SuperAdmin approval
CREATE OR REPLACE FUNCTION public.notify_payment_submitted()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Pending' THEN
        INSERT INTO public.notifications (school_id, recipient_id, type, message, metadata)
        SELECT
            NEW.school_id,
            pa.user_id,
            'payment_pending',
            'New payment submitted for approval: KSh ' || NEW.amount,
            jsonb_build_object('payment_id', NEW.id, 'amount', NEW.amount)
        FROM public.platform_admins pa
        JOIN public.users u ON u.email = pa.email
        WHERE u.auth_user_id IS NOT NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create if payments table exists
DO $$ BEGIN
    DROP TRIGGER IF EXISTS tr_notify_payment ON public.payments;
    CREATE TRIGGER tr_notify_payment
        AFTER INSERT ON public.payments
        FOR EACH ROW
        EXECUTE FUNCTION public.notify_payment_submitted();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- DONE
-- ============================================================
NOTIFY pgrst, 'reload schema';
