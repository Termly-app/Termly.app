-- COMMUNICATIONS SCHEMA: Bulk Message Logging
-- Log for SMS and WhatsApp broadcasts to maintain history and pricing transparency

CREATE TABLE IF NOT EXISTS communications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'SMS', 'WHATSAPP'
    target TEXT NOT NULL, -- 'all', 'defaulters', 'class_name'
    message TEXT NOT NULL,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'dispatched', -- dispatched, failed, delivered
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE communications_log ENABLE ROW LEVEL SECURITY;

-- Basic Policy
CREATE POLICY "Schools see their own communication logs" ON communications_log
    FOR ALL USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE school_id = communications_log.school_id));
