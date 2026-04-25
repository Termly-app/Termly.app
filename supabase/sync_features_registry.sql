-- REFRESH SHULESOFT FEATURES REGISTRY
-- This ensures the Super Admin sees only the modules actually implemented in the codebase

-- 1. Insert/Update Registry with strictly verified ShuleSoft modules
INSERT INTO public.features_registry (feature_key, feature_name, description, category)
VALUES 
    -- General & Dashboard
    ('dashboard',      'Admin Dashboard',    'Core analytics and school overview', 'core'),
    
    -- Academics
    ('students',       'Student Management', 'Enrollment, profiles, and bio-data management', 'academics'),
    ('academics',      'Staff & HR',         'Teacher profiles and staff management', 'academics'),
    ('grading',        'Academic Results',   'Exams, marks entry, and report cards', 'academics'),
    ('attendance',     'Attendance Tracker', 'Daily tracking for students and staff', 'academics'),
    ('timetable',      'Timetable Builder',  'Weekly scheduling and teacher assignments', 'academics'),
    ('library',        'Library Manager',    'Book inventory and circulation tracking', 'academics'),
    
    -- Finance
    ('fees',           'Fees & Billing',     'Fee structures, invoicing, and collections', 'finance'),
    ('mpesa',          'M-PESA Integration',  'Automated fee collection via STK Push', 'finance'),
    ('billing',        'ShuleSoft Billing',  'Manage school subscription to platform', 'finance'),

    -- Communication & Portals
    ('communications', 'Comm. Center',       'SMS broadcasts and automated fee reminders', 'communication'),
    ('teacher_portal', 'Teacher Portal',     'Dedicated portal for marks and attendance', 'portal'),
    ('parent_portal',  'Parent Experience',  'Portal for parents to view results/pay fees', 'portal'),

    -- Compliance & Extra
    ('nemis',          'NEMIS Audit',        'MoE compliance tracking and data export', 'extra'),
    ('lms',            'E-Learning (LMS)',   'Online courses, assignments, and materials', 'extra'),
    ('audit_logs',     'Security Audit',     'Detailed tracking of system-wide activity', 'security')

ON CONFLICT (feature_key) DO UPDATE SET
    feature_name = EXCLUDED.feature_name,
    description  = EXCLUDED.description,
    category     = EXCLUDED.category;

-- Remove legacy/invalid features that are not in the codebase
DELETE FROM public.features_registry 
WHERE feature_key NOT IN (
    'dashboard', 'students', 'academics', 'grading', 'attendance', 
    'timetable', 'library', 'fees', 'mpesa', 'billing', 
    'communications', 'teacher_portal', 'parent_portal', 
    'nemis', 'lms', 'audit_logs'
);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
