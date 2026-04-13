-- ============================================================
-- GLOBAL PLATFORM SETTINGS SEED (Update)
-- ============================================================

-- 1. Detailed Pricing
INSERT INTO platform_settings (key, value, description) VALUES
('pricing', '{
  "Starter": {"price": 4999, "limit": 300, "features": ["profiles", "fees", "attendance", "reports"]},
  "School": {"price": 9999, "limit": 1000, "features": ["everything_starter", "cbc", "exams", "priority"]},
  "Standard": {"price": 14999, "limit": 2500, "features": ["everything_school", "sms", "accounting"]},
  "Premium": {"price": 24999, "limit": 9999, "features": ["multi_campus", "unlimited", "white_label"]}
}', 'Global pricing plans for schools')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Refined Billing (for activation/billing modals)
INSERT INTO platform_settings (key, value, description) VALUES
('billing', '{
  "mpesa_number": "908070", 
  "mpesa_name": "ShuleSoft LTD", 
  "instructions": "Pay via Business Till 908070 (ShuleSoft LTD)",
  "trial_days": 30
}', 'Billing and payment instructions')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Refined Support
INSERT INTO platform_settings (key, value, description) VALUES
('support', '{
  "email": "shulesoft8@gmail.com", 
  "phone": "+254 712 260057",
  "whatsapp": "+254 712 260057"
}', 'Platform support contact details')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
