-- ============================================================
-- Add Customizable Timetable Modes (Weekly, CAT, terminal exams)
-- ============================================================

-- 1. Update timetable_slots to support isolated modes
ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'class';
ALTER TABLE timetable_slots DROP CONSTRAINT IF EXISTS timetable_slots_school_id_period_id_class_grade_stream_day__key;
ALTER TABLE timetable_slots ADD CONSTRAINT timetable_slots_mode_unique 
  UNIQUE(school_id, period_id, class_grade, stream, day_of_week, slot_index, type);

-- 2. Update timetable_configs to support isolated timing per mode
ALTER TABLE timetable_configs ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'class';
ALTER TABLE timetable_configs DROP CONSTRAINT IF EXISTS timetable_configs_school_id_period_id_slot_index_key;
ALTER TABLE timetable_configs ADD CONSTRAINT timetable_configs_mode_unique 
  UNIQUE(school_id, period_id, slot_index, type);

-- 3. Update timetable_requirements to support isolated rules per mode
ALTER TABLE timetable_requirements ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'class';
ALTER TABLE timetable_requirements DROP CONSTRAINT IF EXISTS timetable_requirements_school_id_period_id_class_grade_stream_sub_key;
ALTER TABLE timetable_requirements ADD CONSTRAINT timetable_requirements_mode_unique 
  UNIQUE(school_id, period_id, class_grade, stream, subject, type);
