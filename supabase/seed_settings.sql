-- ============================================================
-- GLOBAL PLATFORM SETTINGS SEED (Restoration)
-- ============================================================

-- 1. Detailed Pricing (Restored to Original Convention)
-- These match the keys used in the Frontend (store.js)
INSERT INTO platform_settings (key, value, description) VALUES
('pricing', '{
  "Starter Plan": {"price": 5000, "limit": 300, "features": ["profiles", "fees", "attendance", "reports"]},
  "Growth Plan": {"price": 10000, "limit": 1000, "features": ["everything_starter", "cbc", "exams", "priority"]},
  "Pro Plan": {"price": 15000, "limit": 2500, "features": ["everything_school", "sms", "accounting"]},
  "Enterprise": {"price": 25000, "limit": 9999, "features": ["multi_campus", "unlimited", "white_label"]},
  "Sandbox": {"price": 0, "limit": 10, "features": ["exploration"]}
}', 'Global pricing plans for schools')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value; -- Using DO UPDATE to restore overwritten settings

-- 2. Billing Instructions
INSERT INTO platform_settings (key, value, description) VALUES
('billing', '{
  "mpesa_number": "908070", 
  "mpesa_name": "ShuleSoft LTD", 
  "instructions": "Pay via Business Till 908070 (ShuleSoft LTD)",
  "trial_days": 30
}', 'Billing and payment instructions')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Support Contact
INSERT INTO platform_settings (key, value, description) VALUES
('support', '{
  "email": "shulesoft8@gmail.com", 
  "phone": "+254 712 260057",
  "whatsapp": "+254 712 260057"
}', 'Platform support contact details')
-- NOTE: We use DO UPDATE here to ensure the support email stays current as you requested earlier.
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
