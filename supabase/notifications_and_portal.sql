-- =============================================
-- Phase 9: Notifications & Portal Access Tables
-- =============================================
-- Run this SQL in Supabase SQL Editor
-- Dependency: Requires existing schools(id) and users(id) tables

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',    -- info, warning, success, alert
  title text NOT NULL,
  body text,
  reference_type text,                  -- 'exam', 'fee_payment', 'student', 'sms', etc.
  reference_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_school 
  ON notifications(school_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created 
  ON notifications(created_at DESC);

-- RLS: Users can only read their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() IN (
    SELECT auth_id FROM users WHERE id = notifications.user_id
  ));

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() IN (
    SELECT auth_id FROM users WHERE id = notifications.user_id
  ));

CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');


-- NOTIFICATION PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'in_app',  -- in_app, sms, email
  category text NOT NULL DEFAULT 'all',    -- all, fees, exams, attendance, announcements
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification prefs"
  ON notification_preferences FOR ALL
  USING (auth.uid() IN (
    SELECT auth_id FROM users WHERE id = notification_preferences.user_id
  ));


-- PORTAL ACCESS SETTINGS TABLE
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

ALTER TABLE portal_access_settings ENABLE ROW LEVEL SECURITY;

-- School admins can manage their own portal settings
CREATE POLICY "School admins can manage portal settings"
  ON portal_access_settings FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM users 
      WHERE auth_id = auth.uid() 
        AND role IN ('admin', 'superadmin')
    )
  );

-- Anyone authenticated can read portal settings for their school (needed by portals)
CREATE POLICY "Authenticated users can read portal settings"
  ON portal_access_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- =============================================
-- DONE: Run this script in your Supabase SQL Editor
-- =============================================
