-- REFRESH SHULESOFT FEATURES REGISTRY
-- This ensures the Super Admin sees the correct names of things offered by ShuleSoft

-- 1. Clear existing (optional, but ON CONFLICT will handle it if we want to keep some)
-- DELETE FROM public.features_registry;

-- 2. Insert/Update Registry with correct ShuleSoft naming
INSERT INTO public.features_registry (feature_key, feature_name, description, category)
VALUES 
    -- Academic Core
    ('students',       'Student Information', 'Enrollment, profiles, and bio-data management', 'academics'),
    ('academics',      'Academic Center',    'Class streams, subjects, and student promotion', 'academics'),
    ('grading',        'Exams & Grading',    'Marks entry, exam processing, and report cards', 'academics'),
    ('attendance',     'Attendance Tracker', 'Daily and lesson-wise tracking for students/staff', 'academics'),
    ('timetable',      'Timetable Builder',  'Automated weekly scheduling and allocations', 'academics'),

    -- Finance & Operations
    ('fees',           'Fee Management',     'Fee structures, invoicing, and collections', 'finance'),
    ('payroll',        'Payroll & HR',       'Staff salaries, tax deductions (NSSF/NHIF), and slips', 'finance'),
    ('inventory',      'Store & Inventory',  'School assets and stationery tracking', 'finance'),
    ('billing',        'School Billing',     'Management of school subscription to ShuleSoft', 'finance'),
    ('mpesa',          'M-PESA Payments',    'Automated fee collection via M-PESA integration', 'finance'),

    -- Communication
    ('communications', 'SMS & Alerts',       'Customized SMS, fee reminders, and result alerts', 'communication'),
    ('parent_portal',  'Parent Experience',  'Mobile app and web portal for parent engagement', 'portal'),
    ('teacher_portal', 'Teacher Portal',     'Portal for marks entry and lesson planning', 'portal'),

    -- Specialized
    ('library',        'Library Manager',    'Book cataloging and circulation tracking', 'extra'),
    ('transport',      'Transport & Fleet',  'School bus tracking and route management', 'extra'),
    ('hostel',         'Hostel Management',  'Dormitory allocation and resident tracking', 'extra'),
    ('nemis',          'NEMIS Connector',    'Data synchronization with government systems', 'extra'),
    ('insurance',      'School Insurance',   'Education insurance covers for parents/students', 'extra'),
    
    -- Security/Admin
    ('audit_logs',     'Security Audit',     'Detailed tracking of all system-wide activities', 'security')

ON CONFLICT (feature_key) DO UPDATE SET
    feature_name = EXCLUDED.feature_name,
    description  = EXCLUDED.description,
    category     = EXCLUDED.category;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
