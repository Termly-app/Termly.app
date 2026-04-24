-- ============================================================
-- SAAS FEATURE-GATING & PLATFORM ADMIN MIGRATION
-- Adds support for per-school module toggles and HQ admin management
-- ============================================================

-- 1. FEATURES REGISTRY
-- Defines all available modules in the platform
CREATE TABLE IF NOT EXISTS public.features_registry (
    feature_key TEXT PRIMARY KEY,
    feature_name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SCHOOL FEATURES
-- Maps features to specific schools (toggles)
CREATE TABLE IF NOT EXISTS public.school_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    feature_key TEXT REFERENCES public.features_registry(feature_key) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, feature_key)
);

-- 3. PLATFORM ADMINS
-- Explicit list of users with global access (HQ Staff)
CREATE TABLE IF NOT EXISTS public.platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'admin', -- admin, super_admin
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SECURITY & RLS
ALTER TABLE public.features_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Feature Registry: Readable by all authenticated users, manageable by platform admins
DROP POLICY IF EXISTS "Anyone can read features" ON public.features_registry;
CREATE POLICY "Anyone can read features" ON public.features_registry
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Platform admins manage registry" ON public.features_registry;
CREATE POLICY "Platform admins manage registry" ON public.features_registry
    FOR ALL USING (public.is_platform_admin());

-- School Features: Readable by school users and platform admins, manageable by platform admins
DROP POLICY IF EXISTS "Users read own school features" ON public.school_features;
CREATE POLICY "Users read own school features" ON public.school_features
    FOR SELECT USING (school_id = (auth.jwt() ->> 'school_id')::uuid OR public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins manage school features" ON public.school_features;
CREATE POLICY "Platform admins manage school features" ON public.school_features
    FOR ALL USING (public.is_platform_admin());

-- Platform Admins: Readable by authenticated users, manageable by platform admins
DROP POLICY IF EXISTS "Admins see platform admin list" ON public.platform_admins;
CREATE POLICY "Admins see platform admin list" ON public.platform_admins
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Platform admins manage admin list" ON public.platform_admins;
CREATE POLICY "Platform admins manage admin list" ON public.platform_admins
    FOR ALL USING (public.is_platform_admin());

-- 5. INITIAL SEEDING
-- Populate the core features registry
INSERT INTO public.features_registry (feature_key, feature_name, description, category)
VALUES 
    ('dashboard',      'Dashboard',          'Core analytics and overview for admins', 'core'),
    ('students',       'Student Management', 'Enrollment, profiles, and attendance', 'core'),
    ('academics',      'Academics Center',   'Stream management and promotion', 'core'),
    ('grading',        'Grading & Exams',    'Marks entry, exam results, and report cards', 'academics'),
    ('fees',           'Fee Management',     'Invoicing, payments, and financial tracking', 'finance'),
    ('timetable',      'Timetable Builder',  'Weekly scheduling and teacher assignments', 'academics'),
    ('attendance',     'Attendance',         'Daily tracking for students and staff', 'core'),
    ('library',        'Library Management', 'Book inventory and circulation tracking', 'extra'),
    ('communications', 'Communications',      'SMS and notification broadcasts', 'core'),
    ('billing',        'School Billing',     'Manage school subscription and invoices', 'finance'),
    ('mpesa',          'M-PESA Integration',  'Automated fee collection via M-PESA', 'finance'),
    ('parent_portal',  'Parent Portal',      'Access for parents to view results and pay fees', 'portal'),
    ('teacher_portal', 'Teacher Portal',     'Access for teachers to enter marks and attendance', 'portal'),
    ('nemis',          'NEMIS Integration',  'Data export for government reporting', 'extra'),
    ('lms',            'Learning Management','Online courses and assignments', 'extra'),
    ('audit_logs',     'Audit Logs',         'Detailed system-wide activity tracking', 'security')
ON CONFLICT (feature_key) DO NOTHING;

-- 6. AUDIT LOG ENHANCEMENT
-- Ensure platform_activity_logs also exists if used in store.js
CREATE TABLE IF NOT EXISTS public.platform_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    description TEXT,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    actor_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.platform_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins read activities" ON public.platform_activity_logs
    FOR SELECT USING (public.is_platform_admin());

-- RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';
