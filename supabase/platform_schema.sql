-- ============================================================
-- ShuleSoft Platform Level Schema (Super Admin)
-- Execute this script in the Supabase SQL Editor
-- ============================================================

-- 1. PLATFORM ACTIVITY LOGS
-- Tracks global events across all schools
CREATE TABLE IF NOT EXISTS platform_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- 'REGISTRATION', 'PAYMENT', 'LOGIN', 'MEMBER_ADD', etc.
    description TEXT,
    actor_email TEXT, -- Who performed the action
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for activity
ALTER TABLE platform_activity ENABLE ROW LEVEL SECURITY;

-- Only Super Admins can see global activity
CREATE POLICY "Super Admins can view all activity" ON platform_activity
    FOR SELECT USING (
        auth.jwt() ->> 'email' IN ('admin@shulesoft.com', 'shulesoft8@gmail.com')
    );

-- 2. PLATFORM SETTINGS
-- Stores global configuration like pricing and support info
CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings (publicly accessible info like price)
CREATE POLICY "Public can view platform settings" ON platform_settings
    FOR SELECT USING (true);

-- Only Super Admins can modify settings
CREATE POLICY "Super Admins can modify platform settings" ON platform_settings
    FOR ALL USING (
        auth.jwt() ->> 'email' IN ('admin@shulesoft.com', 'shulesoft8@gmail.com')
    );

-- Initial Seed Settings
INSERT INTO platform_settings (key, value, description) VALUES
('billing', '{"term_price": 3000, "mpesa_number": "07XXXXXXXX", "trial_days": 30}', 'Global billing and trial configuration')
ON CONFLICT (key) DO NOTHING;

INSERT INTO platform_settings (key, value, description) VALUES
('support', '{"email": "support@shulesoft.com", "phone": "+254 700 000000"}', 'Platform support contact details')
ON CONFLICT (key) DO NOTHING;
