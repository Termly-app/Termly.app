-- ============================================================
-- GLOBAL PLATFORM SETTINGS RESTORATION (FINAL)
-- ============================================================

-- 1. Detailed Pricing & Modules (Restored to Original Single Source of Truth)
INSERT INTO platform_settings (key, value, description) VALUES
('pricing', '{
  "Starter Plan": { 
    "price": 4000, "limit": 150, "admins": 5, 
    "features": ["Student Management", "Attendance Tracking", "CBC Grading (PP1–Grade 6)", "M-PESA Fee Tracking", "Basic Report Cards"], 
    "modules": ["students", "attendance", "grading", "fees"] 
  },
  "Growth Plan": { 
    "price": 10000, "limit": 400, "admins": 10, 
    "features": ["Everything in Starter", "Timetable Builder", "Fee Structure Builder", "NEMIS Data Export", "CBC & 8-4-4 Support", "SMS Notifications"], 
    "modules": ["students", "attendance", "grading", "fees", "timetable", "nemis", "sms"] 
  },
  "Pro Plan": { 
    "price": 20000, "limit": 800, "admins": 20, 
    "features": ["Everything in Growth", "Multi-Campus Support", "Parent Portal", "WhatsApp Integration", "Custom Branding", "Exam Scheduling"], 
    "modules": ["students", "attendance", "grading", "fees", "timetable", "nemis", "sms", "lms", "parent_portal", "custom_brand"] 
  },
  "Enterprise": { 
    "price": 35000, "limit": 100000, "admins": 100, 
    "features": ["Everything Pro", "Dedicated Account Manager", "Custom Features", "Unlimited Staff", "Priority 24/7 Support"],
    "modules": ["students", "attendance", "grading", "fees", "timetable", "nemis", "sms", "lms", "parent_portal", "custom_brand", "unlimited"]
  },
  "Sandbox": { 
    "price": 0, "limit": 10, "admins": 1, 
    "features": ["Student Management", "Feature Exploration"], 
    "modules": ["students", "dashboard"] 
  }
}', 'Global pricing plans for schools')
ON CONFLICT (key) DO NOTHING; -- Protrecting manual UI customizations from being overwritten

-- 2. Billing Instructions (Restored to Peter Kaulani)
INSERT INTO platform_settings (key, value, description) VALUES
('billing', '{
  "mpesa_number": "+254712260057", 
  "mpesa_name": "Peter Kaulani", 
  "instructions": "Send money to +254712260057 (Peter Kaulani)",
  "term_price": 5000,
  "trial_days": 30
}', 'Billing and payment instructions')
ON CONFLICT (key) DO NOTHING; -- Protecting manual UI customizations from being overwritten

-- 3. Support Contact (Kept as shulesoft8@gmail.com)
INSERT INTO platform_settings (key, value, description) VALUES
('support', '{
  "email": "shulesoft8@gmail.com", 
  "phone": "+254 712 260057",
  "whatsapp": "+254 712 260057"
}', 'Platform support contact details')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
