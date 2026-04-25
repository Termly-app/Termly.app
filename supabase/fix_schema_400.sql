-- FIX FOR 400 ERRORS (MISSING TABLES/COLUMNS)

-- 1. Ensure portal_access_settings table exists (Drop view if exists as it might be an old alias)
DROP VIEW IF EXISTS portal_access_settings;
CREATE TABLE IF NOT EXISTS portal_access_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
  parent_portal_enabled boolean DEFAULT true,
  teacher_portal_enabled boolean DEFAULT true,
  parent_can_view_fees boolean DEFAULT true,
  parent_can_view_results boolean DEFAULT true,
  parent_can_view_attendance boolean DEFAULT true,
  allow_parent_self_register boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- 2. Ensure notifications table exists with correct columns
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  reference_type text,
  reference_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. Add missing columns if they were skipped
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='user_id') THEN
    ALTER TABLE notifications ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='is_read') THEN
    ALTER TABLE notifications ADD COLUMN is_read boolean DEFAULT false;
  END IF;
END $$;

-- 4. Enable RLS and Add Policies
ALTER TABLE portal_access_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE id = notifications.user_id));

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE id = notifications.user_id));

DROP POLICY IF EXISTS "Authenticated users can read portal settings" ON portal_access_settings;
CREATE POLICY "Authenticated users can read portal settings"
  ON portal_access_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- 5. Final Schema Reload
NOTIFY pgrst, 'reload schema';
