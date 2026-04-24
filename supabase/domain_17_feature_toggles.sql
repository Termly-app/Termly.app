-- Part 1: Feature Toggles Migration

-- Create feature categories ENUM
CREATE TYPE feature_category AS ENUM ('academic', 'communication', 'finance', 'administration', 'reporting');

-- Table 1: features_registry
CREATE TABLE IF NOT EXISTS public.features_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key VARCHAR(255) UNIQUE NOT NULL,
    feature_name VARCHAR(255) NOT NULL,
    description TEXT,
    category feature_category NOT NULL,
    icon VARCHAR(100),
    is_beta BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Table 2: school_features
CREATE TABLE IF NOT EXISTS public.school_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    feature_key VARCHAR(255) REFERENCES public.features_registry(feature_key) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT false,
    enabled_at TIMESTAMP WITH TIME ZONE,
    enabled_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(school_id, feature_key)
);

-- Table 3: audit_logs (Super Admin Actions)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(255) NOT NULL,
    target_type VARCHAR(100) NOT NULL,
    target_id UUID,
    meta JSONB,
    performed_by UUID REFERENCES auth.users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    ip_address VARCHAR(45)
);

-- Seed features_registry
INSERT INTO public.features_registry (feature_key, feature_name, description, category, icon, is_beta) VALUES
('parent_portal', 'Parent Portal', 'Access for parents to view student progress and pay fees.', 'communication', 'UsersIcon', false),
('sms_alerts', 'SMS Notifications', 'Send SMS alerts for attendance, fees, and results.', 'communication', 'MessageIcon', false),
('email_notifications', 'Email Notifications', 'Automated email alerts and statements.', 'communication', 'MailIcon', false),
('exam_module', 'Exam and Grading Module', 'Comprehensive examination management and transcript generation.', 'academic', 'GraduationIcon', false),
('timetable', 'Timetable Management', 'Generate and manage school schedules.', 'academic', 'CalendarIcon', true),
('library_management', 'Library Module', 'Manage book inventory, checkouts, and returns.', 'administration', 'BookIcon', false),
('transport_management', 'Transport and Routes', 'Manage school buses, routes, and transport fees.', 'administration', 'BusIcon', false),
('fee_management', 'Fee Collection and Invoicing', 'Generate fee structures, invoices, and process payments.', 'finance', 'MoneyIcon', false),
('payroll', 'Staff Payroll', 'Manage staff salaries, deductions, and payslips.', 'finance', 'BanknoteIcon', false),
('attendance_tracking', 'Attendance Tracking', 'Daily student and staff attendance logging.', 'academic', 'ClockIcon', false),
('student_reports', 'Student Progress Reports', 'Advanced analytical reports on student performance.', 'reporting', 'FileIcon', false),
('analytics_dashboard', 'Analytics and Insights', 'High-level dashboards for school administrators.', 'reporting', 'PieChartIcon', false),
('bulk_import', 'Bulk Data Import', 'Import students and staff via CSV.', 'administration', 'UploadIcon', false),
('multi_campus', 'Multi-Campus Support', 'Manage multiple school branches under one account.', 'administration', 'BuildingIcon', true),
('custom_branding', 'School Custom Branding', 'Custom logos, colors, and portal URLs.', 'administration', 'PaletteIcon', false),
('api_access', 'API Access', 'Developer access to school data via REST API.', 'administration', 'CodeIcon', true)
ON CONFLICT (feature_key) DO UPDATE SET 
    feature_name = EXCLUDED.feature_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    icon = EXCLUDED.icon,
    is_beta = EXCLUDED.is_beta;

-- RLS Policies
ALTER TABLE public.features_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read features registry
CREATE POLICY "Anyone can read features_registry" ON public.features_registry FOR SELECT USING (true);

-- Allow school members to read their own features
CREATE POLICY "Schools can read their own features" ON public.school_features FOR SELECT USING (
    school_id = (auth.jwt() ->> 'school_id')::uuid OR auth.jwt() ->> 'role' = 'platform_admin'
);

-- Super admins can do everything on school_features
CREATE POLICY "Super admins control school_features" ON public.school_features USING (
    auth.jwt() ->> 'role' = 'platform_admin'
);

-- Super admins can read and insert audit logs
CREATE POLICY "Super admins control audit_logs" ON public.audit_logs USING (
    auth.jwt() ->> 'role' = 'platform_admin'
);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_school_features_modtime
    BEFORE UPDATE ON public.school_features
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
