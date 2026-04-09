-- ENFORCE ADMISSION NUMBER AS PRIMARY BUSINESS IDENTIFIER
-- Adm No should be unique per school to ensure data integrity

-- 1. Add Unique Constraint
-- Note: This will fail if there are existing duplicates. 
-- In ShuleSoft, redundant IDs are not allowed in production.
ALTER TABLE students ADD CONSTRAINT students_adm_no_school_unique UNIQUE(school_id, adm_no);

-- 2. Add Index for high-speed lookups
-- Since the UI now leads with Adm No everywhere, searching by this field is the most common op.
CREATE INDEX IF NOT EXISTS idx_students_adm_lookups ON students(school_id, adm_no);

-- 3. Comment for documentation
COMMENT ON COLUMN students.adm_no IS 'Primary business identifier and unique across the school namespace.';
