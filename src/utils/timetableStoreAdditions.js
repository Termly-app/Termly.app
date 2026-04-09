/**
 * timetableStoreAdditions.js
 *
// -------------------------------------------------------------------------
 * STEP 1 — Run this SQL in Supabase SQL Editor (in order):
// -------------------------------------------------------------------------
 *
 * -- 1. Time slot configuration per school per period
 * CREATE TABLE IF NOT EXISTS timetable_config (
 *   id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   school_id   UUID REFERENCES schools(id) ON DELETE CASCADE,
 *   period_id   UUID REFERENCES academic_periods(id) ON DELETE CASCADE,
 *   slot_index  INTEGER NOT NULL,
 *   label       TEXT NOT NULL DEFAULT 'Period',
 *   start_time  TEXT NOT NULL DEFAULT '08:00',
 *   end_time    TEXT NOT NULL DEFAULT '08:40',
 *   is_break    BOOLEAN DEFAULT false,
 *   created_at  TIMESTAMPTZ DEFAULT now(),
 *   UNIQUE(school_id, period_id, slot_index)
 * );
 * ALTER TABLE timetable_config ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "School manages own timetable config" ON timetable_config
 *   USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()));
 *
 * -- 2. Timetable grid cells (add double-lesson columns if table exists already)
 * CREATE TABLE IF NOT EXISTS timetable_slots (
 *   id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   school_id        UUID REFERENCES schools(id) ON DELETE CASCADE,
 *   period_id        UUID REFERENCES academic_periods(id) ON DELETE CASCADE,
 *   class_grade      TEXT NOT NULL,
 *   stream           TEXT,
 *   day_of_week      TEXT NOT NULL,
 *   slot_index       INTEGER NOT NULL,
 *   subject          TEXT,
 *   teacher_id       UUID REFERENCES teachers(id) ON DELETE SET NULL,
 *   room             TEXT,
 *   color            TEXT,
 *   is_double_first  BOOLEAN DEFAULT false,
 *   is_double_second BOOLEAN DEFAULT false,
 *   created_at       TIMESTAMPTZ DEFAULT now(),
 *   UNIQUE(school_id, period_id, class_grade, stream, day_of_week, slot_index)
 * );
 * -- If timetable_slots already exists from a previous session, just add the new columns:
 * ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS is_double_first  BOOLEAN DEFAULT false;
 * ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS is_double_second BOOLEAN DEFAULT false;
 * ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "School manages own timetable slots" ON timetable_slots
 *   USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()));
 *
 * -- 3. Lesson requirements (what each class needs per week — drives auto-generate)
 * CREATE TABLE timetable_requirements (
 *   id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   school_id        UUID REFERENCES schools(id) ON DELETE CASCADE,
 *   period_id        UUID REFERENCES academic_periods(id) ON DELETE CASCADE,
 *   class_grade      TEXT NOT NULL,
 *   stream           TEXT,
 *   subject          TEXT NOT NULL,
 *   teacher_id       UUID REFERENCES teachers(id) ON DELETE SET NULL,
 *   periods_per_week INTEGER NOT NULL DEFAULT 1,
 *   allow_double     BOOLEAN DEFAULT false,
 *   color            TEXT,
 *   created_at       TIMESTAMPTZ DEFAULT now(),
 *   UNIQUE(school_id, period_id, class_grade, stream, subject)
 * );
 * ALTER TABLE timetable_requirements ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "School manages own requirements" ON timetable_requirements
 *   USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()));
 *
// -------------------------------------------------------------------------
 */

import { supabase } from './store';

// == TIMETABLE CONFIG ======================================================

export async function getTimetableConfig(schoolId, periodId) {
  const { data, error } = await supabase
    .from('timetable_config')
    .select('*')
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .order('slot_index', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveTimetableConfig(schoolId, periodId, slots) {
  const { error: delErr } = await supabase
    .from('timetable_config')
    .delete()
    .eq('school_id', schoolId)
    .eq('period_id', periodId);
  if (delErr) throw delErr;
  if (!slots || slots.length === 0) return;
  const rows = slots.map((s, i) => ({
    school_id  : schoolId,
    period_id  : periodId,
    slot_index : i,
    label      : s.label      || `Period ${i + 1}`,
    start_time : s.start_time || '08:00',
    end_time   : s.end_time   || '08:40',
    is_break   : s.is_break   || false,
  }));
  const { error } = await supabase.from('timetable_config').insert(rows);
  if (error) throw error;
}

// == TIMETABLE SLOTS ========================================================

export async function getTimetableSlots(schoolId, periodId, classGrade, stream) {
  let query = supabase
    .from('timetable_slots')
    .select('*, teachers(id, name)')
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .eq('class_grade', classGrade);
  if (stream) query = query.eq('stream', stream);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getAllTimetableSlots(schoolId, periodId) {
  const { data, error } = await supabase
    .from('timetable_slots')
    .select('*, teachers(id, name)')
    .eq('school_id', schoolId)
    .eq('period_id', periodId);
  if (error) throw error;
  return data || [];
}

export async function getTeacherTimetable(schoolId, periodId, teacherId) {
  const { data, error } = await supabase
    .from('timetable_slots')
    .select('*')
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .eq('teacher_id', teacherId);
  if (error) throw error;
  return data || [];
}

export async function saveTimetableSlot(schoolId, periodId, slot) {
  const row = {
    school_id        : schoolId,
    period_id        : periodId,
    class_grade      : slot.class_grade,
    stream           : slot.stream           || null,
    day_of_week      : slot.day_of_week,
    slot_index       : slot.slot_index,
    subject          : slot.subject          || null,
    teacher_id       : slot.teacher_id       || null,
    room             : slot.room             || null,
    color            : slot.color            || null,
    is_double_first  : slot.is_double_first  || false,
    is_double_second : slot.is_double_second || false,
  };
  const { error } = await supabase
    .from('timetable_slots')
    .upsert(row, { onConflict: 'school_id,period_id,class_grade,stream,day_of_week,slot_index' });
  if (error) throw error;
}

export async function clearTimetableSlot(schoolId, periodId, classGrade, stream, day, slotIndex) {
  const { error } = await supabase
    .from('timetable_slots')
    .delete()
    .eq('school_id',   schoolId)
    .eq('period_id',   periodId)
    .eq('class_grade', classGrade)
    .eq('stream',      stream || null)
    .eq('day_of_week', day)
    .eq('slot_index',  slotIndex);
  if (error) throw error;
}

/**
 * clearAndSaveTimetable — Used by auto-generate.
 * Replaces ALL slots for the given classes (or entire school) in one operation.
 */
export async function clearAndSaveTimetable(schoolId, periodId, slots, classGrades = null) {
  // Delete existing
  let delQuery = supabase
    .from('timetable_slots')
    .delete()
    .eq('school_id', schoolId)
    .eq('period_id', periodId);
  if (classGrades && classGrades.length > 0) {
    delQuery = delQuery.in('class_grade', classGrades);
  }
  const { error: delErr } = await delQuery;
  if (delErr) throw delErr;

  if (!slots || slots.length === 0) return;

  // Insert in batches of 50 to stay within Supabase request limits
  const BATCH = 50;
  for (let i = 0; i < slots.length; i += BATCH) {
    const batch = slots.slice(i, i + BATCH).map(s => ({
      school_id        : schoolId,
      period_id        : periodId,
      class_grade      : s.class_grade,
      stream           : s.stream           || null,
      day_of_week      : s.day_of_week,
      slot_index       : s.slot_index,
      subject          : s.subject          || null,
      teacher_id       : s.teacher_id       || null,
      room             : s.room             || null,
      color            : s.color            || null,
      is_double_first  : s.is_double_first  || false,
      is_double_second : s.is_double_second || false,
    }));
    const { error } = await supabase.from('timetable_slots').insert(batch);
    if (error) throw error;
  }
}

// == REQUIREMENTS ===========================================================

export async function getRequirements(schoolId, periodId, classGrade, stream) {
  let query = supabase
    .from('timetable_requirements')
    .select('*, teachers(id, name)')
    .eq('school_id', schoolId)
    .eq('period_id', periodId);
  if (classGrade) query = query.eq('class_grade', classGrade);
  if (stream !== undefined) {
    query = stream ? query.eq('stream', stream) : query.is('stream', null);
  }
  query = query.order('subject');
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getAllRequirements(schoolId, periodId) {
  const { data, error } = await supabase
    .from('timetable_requirements')
    .select('*, teachers(id, name)')
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .order('class_grade')
    .order('subject');
  if (error) throw error;
  return data || [];
}

export async function saveRequirement(schoolId, periodId, req) {
  const row = {
    school_id        : schoolId,
    period_id        : periodId,
    class_grade      : req.class_grade,
    stream           : req.stream           || null,
    subject          : req.subject.trim(),
    teacher_id       : req.teacher_id       || null,
    periods_per_week : req.periods_per_week || 1,
    allow_double     : req.allow_double     || false,
    color            : req.color            || null,
  };
  const { error } = await supabase
    .from('timetable_requirements')
    .upsert(row, { onConflict: 'school_id,period_id,class_grade,stream,subject' });
  if (error) throw error;
}

export async function deleteRequirement(schoolId, periodId, classGrade, stream, subject) {
  const { error } = await supabase
    .from('timetable_requirements')
    .delete()
    .eq('school_id',   schoolId)
    .eq('period_id',   periodId)
    .eq('class_grade', classGrade)
    .eq('stream',      stream || null)
    .eq('subject',     subject);
  if (error) throw error;
}

// == SUBJECT ASSIGNMENTS (for auto-import into requirements) ================

export async function getSubjectAssignments(schoolId, periodId, classGrade, stream) {
  let query = supabase
    .from('subject_assignments')
    .select('*, teachers(id, name)')
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .eq('class_grade', classGrade);
  if (stream) query = query.eq('stream', stream);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// == TEACHERS ==============================================================

export async function getTeachers(schoolId) {
  const { data, error } = await supabase
    .from('teachers')
    .select('id, name')
    .eq('school_id', schoolId)
    .order('name');
  if (error) throw error;
  return data || [];
}

// == CONFLICT CHECK ========================================================

/**
 * Returns the conflicting slot if a teacher is already booked at
 * day + slotIndex in a DIFFERENT class. Returns null if free.
 */
export async function checkTeacherConflict(
  schoolId, periodId, teacherId, day, slotIndex, currentClass, currentStream
) {
  if (!teacherId) return null;
  const { data, error } = await supabase
    .from('timetable_slots')
    .select('class_grade, stream, subject')
    .eq('school_id',   schoolId)
    .eq('period_id',   periodId)
    .eq('teacher_id',  teacherId)
    .eq('day_of_week', day)
    .eq('slot_index',  slotIndex);
  if (error) throw error;
  if (!data || data.length === 0) return null;
  const clash = data.find(row => {
    const sameClass  = row.class_grade === currentClass;
    const sameStream = (row.stream || null) === (currentStream || null);
    return !(sameClass && sameStream);
  });
  return clash || null;
}
