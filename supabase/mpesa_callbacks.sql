-- ============================================================
-- M-PESA DARAJA API INTEGRATION
-- ============================================================

-- 1. Raw Callbacks Log (Idempotency and Audit)
CREATE TABLE IF NOT EXISTS public.mpesa_callbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    merchant_request_id TEXT NOT NULL,
    checkout_request_id TEXT NOT NULL,
    result_code INTEGER NOT NULL,
    result_desc TEXT,
    amount NUMERIC(15,2),
    mpesa_receipt_number TEXT UNIQUE,
    transaction_date TIMESTAMPTZ,
    phone_number TEXT,
    bill_ref_number TEXT, -- The "Account" or Student ADM No
    status TEXT DEFAULT 'pending', -- pending, processed, failed, orphaned
    student_id UUID REFERENCES public.students(id), -- Linked during processing
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.mpesa_callbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mpesa_callbacks_select" ON public.mpesa_callbacks 
    FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_school_owner(school_id));

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_mpesa_checkout ON public.mpesa_callbacks(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_receipt ON public.mpesa_callbacks(mpesa_receipt_number);
CREATE INDEX IF NOT EXISTS idx_mpesa_school ON public.mpesa_callbacks(school_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_status ON public.mpesa_callbacks(status);
