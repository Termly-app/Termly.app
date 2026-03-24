-- ============================================================
-- CENTRALIZED SMS NOTIFICATION SYSTEM
-- ============================================================

-- 1. SMS Message Queue
CREATE TABLE IF NOT EXISTS public.sms_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'queued', -- queued, sent, failed, dnd
    type TEXT, -- fee_payment, attendance, broadcast, portal_invite
    provider_response TEXT, -- Response from Africa's Talking/Infobip
    created_at TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_messages_select" ON public.sms_messages 
    FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_sms_school ON public.sms_messages(school_id);
CREATE INDEX IF NOT EXISTS idx_sms_status ON public.sms_messages(status);
CREATE INDEX IF NOT EXISTS idx_sms_type ON public.sms_messages(type);

-- 2. SMS Configuration (Per School)
-- This is stored in school_profiles or a separate config table.
-- For this system, we'll ensure school_profiles has settings for SMS.
ALTER TABLE public.school_profiles 
ADD COLUMN IF NOT EXISTS sms_sender_id TEXT,
ADD COLUMN IF NOT EXISTS sms_balance NUMERIC DEFAULT 0;
