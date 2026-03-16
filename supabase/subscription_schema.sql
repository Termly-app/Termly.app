-- Add subscription fields to school_profiles
ALTER TABLE school_profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'Trial',
ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
ADD COLUMN IF NOT EXISTS last_payment_status TEXT DEFAULT 'none';

-- Create payments table for tracking M-Pesa transaction codes
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES school_profiles(school_id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    transaction_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    payment_date TIMESTAMPTZ DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy: Schools can see only their own payments
DROP POLICY IF EXISTS "Schools can view own payments" ON payments;
CREATE POLICY "Schools can view own payments" ON payments
    FOR SELECT USING (school_id IN (
        SELECT id FROM schools WHERE owner_id = auth.uid()
    ));

-- Policy: Schools can insert their own payments
DROP POLICY IF EXISTS "Schools can insert own payments" ON payments;
CREATE POLICY "Schools can insert own payments" ON payments
    FOR INSERT WITH CHECK (school_id IN (
        SELECT id FROM schools WHERE owner_id = auth.uid()
    ));
