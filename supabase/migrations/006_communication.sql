-- ============================================================
-- 006_COMMUNICATION.SQL — Announcements, Messages,
-- Notifications, and Preferences Schema
-- ============================================================

-- ─── 1. ANNOUNCEMENTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all',
    -- all, teachers, parents, class, staff_only
  class_id UUID REFERENCES public.classes(id),
  is_pinned BOOLEAN DEFAULT FALSE,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft',
    -- draft, published, scheduled
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ann_school ON public.announcements(school_id, status);
CREATE INDEX IF NOT EXISTS idx_ann_class ON public.announcements(class_id);

-- ─── 2. ANNOUNCEMENT READS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ar_announcement ON public.announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_ar_user ON public.announcement_reads(user_id);

-- ─── 3. MESSAGES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id),
  recipient_id UUID NOT NULL REFERENCES public.users(id),
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_msg_recipient ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_msg_school ON public.messages(school_id);

-- ─── 4. MESSAGE ATTACHMENTS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INT
);

CREATE INDEX IF NOT EXISTS idx_ma_message ON public.message_attachments(message_id);

-- ─── 5. NOTIFICATIONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  type TEXT NOT NULL,           -- event type key
  title TEXT NOT NULL,
  body TEXT,
  reference_type TEXT,         -- 'assignment', 'exam', 'message', etc.
  reference_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_school ON public.notifications(school_id);

-- ─── 6. NOTIFICATION PREFERENCES ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  in_app BOOLEAN DEFAULT TRUE,
  email BOOLEAN DEFAULT FALSE,
  sms BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_np_user ON public.notification_preferences(user_id);

-- ─── 7. DEFAULT NOTIFICATION PREFERENCES SEED ────────────────
CREATE OR REPLACE FUNCTION public.seed_notification_preferences(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id, event_type, in_app, email, sms)
  VALUES
    (p_user_id, 'assignment_published',  TRUE, FALSE, FALSE),
    (p_user_id, 'assignment_graded',     TRUE, FALSE, FALSE),
    (p_user_id, 'new_message',           TRUE, FALSE, FALSE),
    (p_user_id, 'new_announcement',      TRUE, FALSE, FALSE),
    (p_user_id, 'submission_late',       TRUE, FALSE, FALSE),
    (p_user_id, 'assignment_due_reminder', TRUE, FALSE, FALSE),
    (p_user_id, 'exam_published',        TRUE, FALSE, FALSE),
    (p_user_id, 'exam_results_sms',      TRUE, FALSE, TRUE),  -- SMS ON by default
    (p_user_id, 'exam_results_parent',   TRUE, FALSE, FALSE)
  ON CONFLICT (user_id, event_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── 8. RLS ──────────────────────────────────────────────────
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Announcements
CREATE POLICY "ann_select" ON public.announcements
  FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));
CREATE POLICY "ann_modify" ON public.announcements
  FOR ALL USING (
    created_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    OR public.is_school_owner(school_id) OR public.is_school_admin(school_id)
  );

-- Announcement Reads
CREATE POLICY "ar_select" ON public.announcement_reads
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    OR announcement_id IN (
      SELECT id FROM public.announcements WHERE public.is_school_admin(school_id) OR public.is_school_owner(school_id)
    )
  );
CREATE POLICY "ar_insert" ON public.announcement_reads
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- Messages: sender or recipient can see
CREATE POLICY "msg_select" ON public.messages
  FOR SELECT USING (
    sender_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    OR recipient_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "msg_insert" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "msg_update" ON public.messages
  FOR UPDATE USING (
    recipient_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- Message Attachments
CREATE POLICY "ma_select" ON public.message_attachments
  FOR SELECT USING (
    message_id IN (SELECT id FROM public.messages)
  );
CREATE POLICY "ma_insert" ON public.message_attachments
  FOR INSERT WITH CHECK (
    message_id IN (
      SELECT id FROM public.messages
      WHERE sender_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
  );

-- Notifications: user sees their own
CREATE POLICY "notif_select" ON public.notifications
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "notif_update" ON public.notifications
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "notif_insert" ON public.notifications
  FOR INSERT WITH CHECK (
    public.is_school_owner(school_id) OR public.is_school_admin(school_id)
    OR school_id = public.get_auth_school_id()
  );

-- Notification Preferences: user manages their own
CREATE POLICY "np_select" ON public.notification_preferences
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "np_modify" ON public.notification_preferences
  FOR ALL USING (
    user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );
