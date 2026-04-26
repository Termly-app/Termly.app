-- Unify Feature Registry keys with UI expectations (App.jsx)
-- This script ensures the features_registry table matches the keys used in useFeature() calls.

-- 1. Create a temporary mapping of old keys to new keys if needed
-- (Assuming the old keys were the long ones in FeaturesContext.jsx)

-- 2. Clear existing registry to avoid conflicts (or use UPSERT)
-- We'll use UPSERT to keep existing descriptions if they exist, 
-- but we really want to ENSURE these specific keys exist.

INSERT INTO features_registry (feature_key, feature_name, description, is_beta)
VALUES 
  ('grading', 'Academic Grading', 'KNEC-ready report cards, CBC competency reports, and automated rankings.', false),
  ('attendance', 'Attendance Tracking', 'Mobile-friendly roll call with instant SMS absentee alerts to parents.', false),
  ('timetable', 'Class Timetable', 'Conflict-free scheduling for classes, teachers, and rooms.', false),
  ('lms', 'E-Learning (LMS)', 'Digital assignments, study materials, and online assessments.', false),
  ('fees', 'Finance & Billing', 'Fee collection tracking, M-Pesa integration, and automated receipts.', false),
  ('communications', 'Communication Center', 'Bulk SMS, email notifications, and school-wide announcements.', false),
  ('teacher_portal', 'Teacher Portal', 'Dedicated mobile access for staff to enter marks and attendance.', false),
  ('parent_portal', 'Parent Portal', 'Secure portal for parents to view results, fees, and school updates.', false),
  ('library', 'Library Management', 'Track books, lending history, and automated overdue reminders.', false),
  ('transport', 'Transport & Fleet', 'Route management, bus tracking, and student transport status.', false),
  ('payroll', 'Staff Payroll', 'Automated salary calculations, payslips, and tax compliance.', false),
  ('inventory', 'Inventory & Stores', 'Manage school supplies, equipment, and stock levels.', false),
  ('nemis', 'NEMIS Audit', 'Tools to reconcile school data with the national NEMIS database.', false)
ON CONFLICT (feature_key) DO UPDATE 
SET 
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  is_beta = EXCLUDED.is_beta;

-- 3. Migration: If any school had 'exam_module' enabled, enable 'grading' for them
-- This ensures existing setups don't break.
INSERT INTO school_features (school_id, feature_key, is_enabled)
SELECT school_id, 'grading', is_enabled 
FROM school_features 
WHERE feature_key = 'exam_module'
ON CONFLICT (school_id, feature_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

INSERT INTO school_features (school_id, feature_key, is_enabled)
SELECT school_id, 'attendance', is_enabled 
FROM school_features 
WHERE feature_key = 'attendance_tracking'
ON CONFLICT (school_id, feature_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

INSERT INTO school_features (school_id, feature_key, is_enabled)
SELECT school_id, 'fees', is_enabled 
FROM school_features 
WHERE feature_key = 'fee_management'
ON CONFLICT (school_id, feature_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

INSERT INTO school_features (school_id, feature_key, is_enabled)
SELECT school_id, 'library', is_enabled 
FROM school_features 
WHERE feature_key = 'library_management'
ON CONFLICT (school_id, feature_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
