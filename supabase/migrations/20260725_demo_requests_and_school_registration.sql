-- ============================================================
-- 20260725_demo_requests_and_school_registration.sql
--
-- Supports the new onboarding flow: prospects book a demo from
-- the landing page (public, no login) instead of self-registering;
-- the platform admin reviews the request and registers the school
-- manually via SuperAdmin (handled by the admin-register-school
-- edge function, which reuses the existing register_school RPC).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.demo_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    student_count TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'registered', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a demo request (this is the public landing page form) —
-- but only INSERT, never read back other people's submissions.
DROP POLICY IF EXISTS "Anyone can submit a demo request" ON public.demo_requests;
CREATE POLICY "Anyone can submit a demo request" ON public.demo_requests
    FOR INSERT WITH CHECK (true);

-- Only platform admins can view or update requests.
DROP POLICY IF EXISTS "Platform admins can view demo requests" ON public.demo_requests;
CREATE POLICY "Platform admins can view demo requests" ON public.demo_requests
    FOR SELECT USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can update demo requests" ON public.demo_requests;
CREATE POLICY "Platform admins can update demo requests" ON public.demo_requests
    FOR UPDATE USING (public.is_platform_admin());

CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON public.demo_requests(status, created_at DESC);
