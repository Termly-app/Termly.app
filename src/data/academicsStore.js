import { supabase } from '../lib/supabase';
import { logPlatformActivity, logAuditEvent } from './store';
import {
  _currentSchoolId,
  _currentAuthUser,
  _currentExamType,
  _currentPeriodId,
  mutationGuard,
  updateSchoolFeature
} from './coreStore';
import { getTeachers } from './staffStore';
import { withRetry } from '../utils/resilience';

export async function getPeriods() {
  if (!_currentSchoolId) return [];
  
  if (!_currentAuthUser && _currentSchoolId) {
    const { data, error } = await supabase.rpc('portal_get_periods', { p_school_id: _currentSchoolId });
    if (error) throw error;
    return data || [];
  }

  const { data, error } = await supabase
    .from('academic_periods')
    .select('id, year, term, is_active, school_id')
    .eq('school_id', _currentSchoolId)
    .order('year', { ascending: false })
    .order('term', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createPeriod(year, term, setAsActive = false) {
  mutationGuard('createPeriod');
  if (!_currentSchoolId) return;
  const { data, error } = await supabase
    .from('academic_periods')
    .insert({ school_id: _currentSchoolId, year, term, is_active: setAsActive })
    .select()
    .single();
  if (error) throw error;
  
  if (setAsActive) {
    // Unset others
    await supabase.from('academic_periods')
      .update({ is_active: false })
      .eq('school_id', _currentSchoolId)
      .neq('id', data.id);
    setCurrentPeriodId(data.id);
  }
  return data;
}

export async function setActivePeriod(periodId) {
  mutationGuard('setActivePeriod');
  if (!_currentSchoolId) return;
  // Update DB
  await supabase.from('academic_periods')
    .update({ is_active: false })
    .eq('school_id', _currentSchoolId);
  
  const { error } = await supabase.from('academic_periods')
    .update({ is_active: true })
    .eq('id', periodId);
  if (error) throw error;
  
  setCurrentPeriodId(periodId);
  window.dispatchEvent(new Event('periodChanged'));
}

export async function initActivePeriod() {
  if (!_currentSchoolId) return null;
  const periods = await getPeriods();
  let active = periods.find(p => p.is_active);
  if (!active && periods.length > 0) {
    active = periods[0];
  } else if (!active) {
    // Create default first term
    active = await createPeriod('2025', 'Term 1', true);
  }
  setCurrentPeriodId(active.id);
  return active;
}

export async function getCurrentPeriodDetails() {
  const periods = await getPeriods();
  return periods.find(p => p.id === _currentPeriodId) || null;
}

export async function getMarks(examType = _currentExamType) {
  if (!_currentSchoolId || !_currentPeriodId) return {};
  const cacheKey = `marks_${_currentSchoolId}_${_currentPeriodId}_${examType}`;
  return cachedQuery(cacheKey, async () => {
    const { data, error } = await supabase
      .from('marks')
      .select('student_id, subject, mark')
      .eq('school_id', _currentSchoolId)
      .eq('period_id', _currentPeriodId)
      .eq('exam_type', examType);
    if (error) throw error;
    const marks = {};
    (data || []).forEach(row => {
      if (!marks[row.student_id]) marks[row.student_id] = {};
      marks[row.student_id][row.subject] = row.mark;
    });
    return marks;
  });
}

export async function setStudentAllMarks(studentId, subjectMarks, examType = _currentExamType) {
  mutationGuard('setStudentAllMarks');
  const userRecord = await getUserByAuthId(_currentAuthUser?.id);
  const creatorId = userRecord?.id || _currentUserId;
  
  const rows = Object.entries(subjectMarks).map(([subject, mark]) => ({
    school_id: _currentSchoolId,
    student_id: studentId,
    subject,
    mark: Math.max(0, Math.min(100, Number(mark) || 0)),
    period_id: _currentPeriodId,
    exam_type: examType,
    created_by: creatorId
  }));

  if (rows.length === 0) return;
  
  console.log(`[STORE] Saving ${rows.length} marks for student ${studentId} (Exam: ${examType}, CreatedBy: ${creatorId})`);
  
  const { error } = await supabase
    .from('marks')
    .upsert(rows, { onConflict: 'school_id,student_id,subject,period_id,exam_type' });
  
  if (error) {
    console.error('[STORE] Failed to save marks. Payload:', { rows: rows.slice(0, 3), total: rows.length });
    console.error('[STORE] Supabase Error:', error);
    throw error;
  }
}

export async function getClassResults(className, examType = _currentExamType) {
  const students = (await getStudents()).filter(s => s.class === className);
  const marks = await getMarks(examType);
  const profile = await getSchoolProfile();
  const subjects = getSubjectsForGrade(className, profile);

  const results = students.map(s => {
    const m = marks[s.id] || {};
    const enrolledSubjects = (s.subjects && s.subjects.length > 0) ? s.subjects : subjects;
    const relevantMarks = enrolledSubjects.map(sub => m[sub] || 0);
    const total = relevantMarks.reduce((sum, v) => sum + v, 0);
    const average = enrolledSubjects.length > 0 ? (total / enrolledSubjects.length).toFixed(1) : 0;
    const cleanMarks = {};
    enrolledSubjects.forEach(sub => { cleanMarks[sub] = m[sub] || 0; });
    return { ...s, marks: cleanMarks, total, average: Number(average), level: getLevelForGrade(className), enrolledSubjects };
  });

  results.sort((a, b) => b.total - a.total);
  results.forEach((r, i) => { r.rank = i + 1; });
  return results;
}

export async function getSubjectRankings(className, examType = _currentExamType) {
  const students = (await getStudents()).filter(s => s.class === className);
  const marks = await getMarks(examType);
  const profile = await getSchoolProfile();
  const subjects = getSubjectsForGrade(className, profile);
  const rankings = {};
  subjects.forEach(sub => {
    const subResults = students
      .filter(s => !s.subjects || s.subjects.length === 0 || s.subjects.includes(sub))
      .map(s => ({
        ...s, mark: (marks[s.id] || {})[sub] || 0,
      })).sort((a, b) => b.mark - a.mark);
    subResults.forEach((r, i) => { r.rank = i + 1; });
  rankings[sub] = subResults;
  });
  return rankings;
}

export async function getClassList(className, classId = null, subjectName = null, streamName = null) {
  let students = [];
  const isPortalMode = !_currentAuthUser && _currentSchoolId;

  if (isPortalMode) {
    // Portal mode: use RPC to bypass RLS
    // We do NOT apply stream/subject filters — teacher already selected a specific paper
    console.log('[PORTAL] getClassList for class:', className, 'classId:', classId);
    
    // Strategy 1: Use simple text-based RPC (most reliable)
    try {
      const { data, error } = await supabase.rpc('portal_get_students_by_class_name', { 
        p_school_id: _currentSchoolId,
        p_class_name: className
      });
      if (!error && data && data.length > 0) {
        console.log('[PORTAL] Text-based RPC returned', data.length, 'students');
        return data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }
      if (error) console.warn('[PORTAL] portal_get_students_by_class_name error:', error.message);
    } catch (e) {
      console.warn('[PORTAL] Text RPC failed:', e.message);
    }

    // Strategy 2: Use UUID-based RPC (original)
    if (classId) {
      try {
        const { data, error } = await supabase.rpc('portal_get_class_students', { 
          p_school_id: _currentSchoolId,
          p_class_id: classId
        });
        if (!error && data && data.length > 0) {
          console.log('[PORTAL] UUID-based RPC returned', data.length, 'students');
          return data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
        if (error) console.warn('[PORTAL] portal_get_class_students error:', error.message);
      } catch (e) {
        console.warn('[PORTAL] UUID RPC failed:', e.message);
      }
    }

    // Strategy 3: Direct table query (may be blocked by RLS but worth trying)
    try {
      const { data: fallback, error: fbErr } = await supabase
        .from('students')
        .select('id, name, adm_no, class, stream, subjects')
        .eq('school_id', _currentSchoolId)
        .eq('class', className);
      if (!fbErr && fallback && fallback.length > 0) {
        console.log('[PORTAL] Direct query returned', fallback.length, 'students');
        return fallback.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }
    } catch (e) {
      console.warn('[PORTAL] Direct query failed:', e.message);
    }

    console.error('[PORTAL] All strategies failed to find students for class:', className);
    return [];
  }

  // Admin mode: use local cache
  students = (await getStudents()).filter(s => s.class === className);

  // 1. Filter by Stream (Strict) — admin mode only
  if (streamName) {
    const sLower = streamName.toLowerCase();
    const isGeneral = sLower === 'general';
    students = students.filter(s => {
      const studentStream = (s.stream || '').toLowerCase();
      if (studentStream === sLower) return true;
      if (isGeneral && (studentStream === '' || studentStream === 'all')) return true;
      if (s.class && s.class.toLowerCase().includes(sLower)) return true;
      return false;
    });
  }

  // 2. Filter by Subject (Strict Enrollment Only) — admin mode only
  if (subjectName) {
    const subLower = subjectName.toLowerCase();
    const hasEnrollmentData = students.some(s => s.subjects && s.subjects.length > 0);
    
    if (hasEnrollmentData) {
      students = students.filter(s => {
        if (!s.subjects || s.subjects.length === 0) return false;
        return s.subjects.some(sub => sub.toLowerCase().includes(subLower) || subLower.includes(sub.toLowerCase()));
      });
    }
  }

  return students.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getExamMarksForPaper(paperId) {
  // 1. Get marks from new portal table
  const { data: portalMarks, error: portalErr } = await supabase
    .from('exam_marks')
    .select('student_id, raw_score, is_absent')
    .eq('exam_paper_id', paperId);
  
  // 2. Also get marks from legacy admin table (for two-way sync)
  const { data: paper } = await supabase
    .from('exam_papers')
    .select('subject, exam_id')
    .eq('id', paperId)
    .maybeSingle(); // More resilient than .single()
  
  let legacyMarks = [];
  if (paper) {
    const { data: exam } = await supabase
      .from('exams')
      .select('name')
      .eq('id', paper.exam_id)
      .maybeSingle();
    
    if (exam) {
      const { data } = await supabase
        .from('marks')
        .select('student_id, mark')
        .eq('school_id', _currentSchoolId)
        .eq('exam_type', exam.name)
        .eq('subject', paper.subject);
      legacyMarks = data || [];
    }
  }

  // Merge: Portal marks take priority, but legacy marks fill the gaps
  const merged = {};
  legacyMarks.forEach(m => { merged[m.student_id] = { raw_score: m.mark, is_absent: false }; });
  (portalMarks || []).forEach(m => { merged[m.student_id] = m; });

  return Object.entries(merged).map(([id, m]) => ({ student_id: id, ...m }));
}

export async function getExams() {
  if (!_currentSchoolId) return [];
  
  // Portal mode: strictly identify portal users via sessionStorage
  const isPortalUser = !!sessionStorage.getItem('Termly_portal_user_id');
  if (isPortalUser && _currentSchoolId) {
    const { data, error } = await supabase.rpc('portal_get_open_exams', { p_school_id: _currentSchoolId });
    if (error) throw error;
    return data || [];
  }

  // Admin/Standard mode: use direct table query
  const cacheKey = `exams_${_currentSchoolId}_${_currentPeriodId}`;
  return cachedQuery(cacheKey, async () => {
    let query = supabase
      .from('exams')
      .select('*')
      .eq('school_id', _currentSchoolId);
    
    // If we are in Staff Portal mode (initialized with teacher id but not parent portal session),
    // we might want to filter by status. Let's check if there is a teacher session.
    const isTeacherPortal = !!sessionStorage.getItem('Termly_teacher_id');
    if (isTeacherPortal) {
      query = query.eq('status', 'published'); // Published here means 'Open for Teachers'
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  });
}

/**
 * [UNIFICATION] Auto-migration helper for legacy exams
 */
async function migrateLegacyExams(examsList) {
  if (!examsList || examsList.length === 0 || !_currentSchoolId) return;
  console.log('[UNIFICATION] Migrating legacy exams:', examsList);
  
  const periodId = _currentPeriodId || 'Current';
  
  for (const name of examsList) {
    try {
      // Check if already exists in robust table
      const { data: existing } = await supabase
        .from('exams')
        .select('id')
        .eq('school_id', _currentSchoolId)
        .eq('name', name)
        .maybeSingle();

      if (!existing) {
        console.log(`[UNIFICATION] Creating robust record for: ${name}`);
        await createExam(name, 'endterm', periodId);
      }
    } catch (e) {
      console.error(`[UNIFICATION] Failed to migrate ${name}:`, e.message);
    }
  }

  // Clear legacy field to prevent re-migration
  await supabase
    .from('school_profiles')
    .update({ custom_exams: [] })
    .eq('school_id', _currentSchoolId);
}

/**
 * Creates a new unified exam record
 */
export async function createExam(name, type = 'endterm', term = 'Current', status = 'setup') {
  mutationGuard('createExam');
  const userRecord = await getUserByAuthId(_currentAuthUser?.id);
  const creatorId = userRecord?.id || _currentUserId;
  
  console.log(`[STORE] Creating exam: ${name} (Type: ${type}, CreatedBy: ${creatorId})`);
  
  const { data, error } = await supabase
    .from('exams')
    .insert({
      school_id: _currentSchoolId,
      name,
      exam_type: type,
      term: term,
      academic_year: term,
      status: status, 
      created_by: creatorId
    })
    .select()
    .single();

  if (error) {
    console.error('[STORE] Failed to create exam:', error);
    throw error;
  }
  invalidateCache(`exams_${_currentSchoolId}_${_currentPeriodId}`);
  return data;
}

export async function deleteExam(examId) {
  mutationGuard('deleteExam');
  const { error } = await supabase
    .from('exams')
    .delete()
    .eq('id', examId);
  
  if (error) throw error;
  invalidateCache(`exams_${_currentSchoolId}_${_currentPeriodId}`);
  return true;
}

export async function updateExam(examId, updates) {
  mutationGuard('updateExam');
  const { error } = await supabase
    .from('exams')
    .update(updates)
    .eq('id', examId);
  
  if (error) throw error;
  invalidateCache(`exams_${_currentSchoolId}_${_currentPeriodId}`);
}

/**
 * Updates the status of an exam (e.g., 'published', 'draft', 'closed')
 */
export async function updateExamStatus(examId, newStatus) {
  const { error } = await supabase
    .from('exams')
    .update({ status: newStatus })
    .eq('id', examId);
  if (error) throw error;
  
  invalidateCache(`exams_${_currentSchoolId}_${_currentPeriodId}`);
  return true;
}

export async function releaseExamToParents(examId, isReleased = true) {
  const { error } = await supabase
    .from('exams')
    .update({ released_to_parents: isReleased })
    .eq('id', examId);
  if (error) throw error;
  
  invalidateCache(`exams_${_currentSchoolId}_${_currentPeriodId}`);
  return true;
}

/**
 * Subscribes to real-time changes for a specific table and school.
 */
export function subscribeToTable(tableName, callback) {
  const channel = supabase
    .channel(`${tableName}_realtime`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: tableName,
        filter: `school_id=eq.${_currentSchoolId}`
      },
      (payload) => {
        // Invalidate cache when changes occur
        invalidateCache(); 
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function getExamPapers(examId) {
  if (!_currentSchoolId || !examId) return [];
  
  if (!_currentAuthUser && _currentSchoolId) {
    // Portal mode: Fetch papers via RPC (usually for teachers entering marks)
    // Use teacher_record_id if available (from staff login), otherwise fall back to userId
    const teacherId = _currentUserId;
    console.log('[PORTAL] Fetching papers for teacher:', teacherId, 'exam:', examId);
    const { data, error } = await supabase.rpc('portal_get_teacher_papers', { 
      p_teacher_id: teacherId, 
      p_exam_id: examId 
    });
    if (error) {
      console.warn('portal_get_teacher_papers error:', error.message);
      return [];
    }
    return data || [];
  }

  const { data, error } = await supabase
    .from('exam_papers')
    .select('*, tt_subjects(name), classes(name, stream)')
    .eq('exam_id', examId);
  if (error) throw error;
  return data;
}


export async function saveExamMarks(paperId, marks) {
  mutationGuard('saveExamMarks');
  if (!_currentAuthUser && _currentSchoolId) {
    const portalMarks = marks.map(m => ({
      ...m,
      exam_paper_id: paperId,
      school_id: _currentSchoolId
    }));
    const { data, error } = await supabase.rpc('portal_save_exam_marks', { p_marks: portalMarks });
    if (error) throw error;
    return data;
  }

  const rows = marks.map(m => ({
    ...m,
    exam_paper_id: paperId,
    school_id: _currentSchoolId,
    entered_by: _currentUserId,
    entered_at: new Date().toISOString()
  }));
  const { error } = await supabase
    .from('exam_marks')
    .upsert(rows, { onConflict: 'exam_paper_id,student_id' });
  if (error) throw error;
}

export async function saveExamPapers(examId, papers) {
  mutationGuard('saveExamPapers');
  const rows = papers.map(p => ({
    ...p,
    exam_id: examId,
    school_id: _currentSchoolId
  }));
  const { error } = await supabase
    .from('exam_papers')
    .upsert(rows, { onConflict: 'exam_id,class_id,subject_id' });
  if (error) throw error;
}

export async function getExamResults(examId) {
  const { data, error } = await supabase
    .from('exam_results')
    .select('*, students(name, adm_no), classes(name, stream)')
    .eq('exam_id', examId)
    .order('class_position', { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * Fetch results for a specific student, only from PUBLISHED exams.
 */
export async function getStudentExamResults(studentId) {
  if (!_currentSchoolId || !studentId) return [];

  // Portal mode: portal_get_student_results_v2 already does
  // exam_results-first, marks-table-fallback internally, gated on
  // released_to_parents. Trust it directly — the old layered
  // fallbacks (a direct un-scoped exam_results query, then the
  // long-dead portal_get_student_results v1) were the actual bug:
  // the direct query could "succeed" with one old released exam and
  // return before ever reaching the logic that also checks marks.
  if (!_currentAuthUser && _currentSchoolId) {
    const { data, error } = await supabase.rpc('portal_get_student_results_v2', {
      p_student_id: studentId,
      p_school_id: _currentSchoolId,
    });
    if (error) {
      console.error('[Portal] Student results RPC failed:', error.message);
      throw error;
    }
    return (data || []).map(r => ({
      ...r,
      exams: { name: r.exam_name, term: r.exam_term, exam_type: r.exam_type },
    }));
  }

  // Admin/staff mode: unchanged.
  const { data, error } = await supabase
    .from('exam_results')
    .select('*, exams(name, term, exam_type)')
    .eq('student_id', studentId);

  if (error) throw error;
  return (data || []).filter(r => r.exams);
}

export async function getStudentProfile(studentId) {
  if (!_currentSchoolId || !studentId) return null;

  // Portal mode: try direct query first
  if (!_currentAuthUser && _currentSchoolId) {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, adm_no, class, stream, gender, parent, parent_phone')
        .eq('id', studentId)
        .single();
      if (!error && data) return { ...data, parent_name: data.parent };
    } catch (e) {
      console.warn('[Portal] Direct student profile query failed:', e.message);
    }
    // Fallback to RPC
    try {
      const { data, error } = await supabase.rpc('portal_get_student_profile', { p_student_id: studentId, p_school_id: _currentSchoolId });
      if (!error) return data || null;
    } catch (e) {
      console.warn('[Portal] RPC student profile also failed:', e.message);
    }
    return null;
  }

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getSubjectDetails(studentId) {
  if (!_currentSchoolId || !studentId) return [];

  // Strategy 1: Get subjects from student record/marks via RPC
  try {
    const { data, error } = await supabase.rpc('portal_get_student_subjects', { p_student_id: studentId, p_school_id: _currentSchoolId });
    if (!error && data && Array.isArray(data) && data.length > 0) {
      return data.map(s => typeof s === 'string' ? { subject_name: s, name: s } : { ...s, subject_name: s.name || s.subject_name });
    }
  } catch (e) {
    console.warn('[Portal] Subject RPC failed:', e.message);
  }

  // Strategy 2: Try direct tt_subjects query
  try {
    const { data, error } = await supabase
      .from('tt_subjects')
      .select('id, name, short_code')
      .eq('school_id', _currentSchoolId);
    if (!error && data && data.length > 0) return data.map(s => ({ ...s, subject_name: s.name, code: s.short_code }));
  } catch (e) {
    console.warn('[Portal] Direct subjects query failed:', e.message);
  }

  // Strategy 3: Fallback to RPC
  try {
    const { data, error } = await supabase.rpc('portal_get_subject_details', { p_student_id: studentId, p_school_id: _currentSchoolId });
    if (!error) return data || [];
  } catch (e) {
    console.warn('[Portal] RPC subject details also failed:', e.message);
  }
  return [];
}


export async function calculateExamResults(examId) {
  mutationGuard('calculateExamResults');
  
  // 1. Get all marks and papers for this exam
  const { data: marks, error: mErr } = await supabase
    .from('exam_marks')
    .select('student_id, raw_score, is_absent, exam_papers(class_id, subject_id)')
    .eq('exam_papers.exam_id', examId);
  
  if (mErr) throw mErr;

  // 2. Group by student
  const studentTotals = {};
  marks.forEach(m => {
    if (!studentTotals[m.student_id]) {
      studentTotals[m.student_id] = { 
        student_id: m.student_id, 
        total: 0, 
        count: 0, 
        class_id: m.exam_papers?.class_id || null 
      };
    }
    if (!m.is_absent && m.raw_score !== null) {
      studentTotals[m.student_id].total += Number(m.raw_score);
      studentTotals[m.student_id].count += 1;
    }
  });

  // 3. Sort for ranking
  const results = Object.values(studentTotals).map(s => ({
    exam_id: examId,
    school_id: _currentSchoolId,
    student_id: s.student_id,
    class_id: s.class_id,
    total_marks: s.total,
    total_subjects: s.count,
    mean_score: s.count > 0 ? (s.total / s.count) : 0
  })).sort((a, b) => b.total_marks - a.total_marks);

  // 4. Assign class_position
  results.forEach((r, i) => {
    r.class_position = i + 1;
    r.class_size = results.length;
  });

  // 5. Upsert results
  const { error: uErr } = await supabase
    .from('exam_results')
    .upsert(results, { onConflict: 'exam_id,student_id' });
  
  if (uErr) throw uErr;
}

// ============= FEES =============
/**
 * Ensures a student's fee record is in sync with the current profile configuration.
 * Fixes "0" total_fee issues and recalculates balances if configuration has changed.
 */
export async function reconcileStudentFee(studentId, existingRecord = null) {
  mutationGuard('reconcileStudentFee');
  if (!studentId || !_currentSchoolId || !_currentPeriodId) return null;

  const students = await getStudents();
  const student = students.find(s => s.id === studentId);
  const profile = await getSchoolProfile();
  const configTotal = getCalculatedTotalFee(student, profile);

  if (configTotal === null) return existingRecord; // No config, can't reconcile

  const record = existingRecord || (await getFees())[studentId];
  
  // If no record exists, we don't create one here (recordPayment handles creation)
  if (!record) return null;

  const currentTotal = Number(record.totalFee);
  
  // Reconcile if total is 0 or different from config
  if (currentTotal === 0 || currentTotal !== configTotal) {
    const newPaid = Number(record.paid) || 0;
    const newBalance = configTotal - newPaid;

    const { error } = await supabase
      .from('fees')
      .update({
        total_fee: configTotal,
        balance: newBalance
      })
      .eq('id', record._feeId);

    if (error) {
      console.error('Fee reconciliation failed:', error);
      return record;
    }

    // Update local record to avoid re-syncing
    record.totalFee = configTotal;
    record.balance = newBalance;
    
    invalidateCache(`fees_${_currentSchoolId}_${_currentPeriodId}`);
  }

  return record;
}


/**
 * Internal helper to calculate a student's total fee based on their class and residence type.
 * Returns null if the fee is not configured in the school profile.
 */
function getCalculatedTotalFee(student, profile) {
  if (!student || !profile) return null;
  const grade = student.class;
  const gradeFees = profile.gradeFees || {};
  const customFee = gradeFees[grade];
  
  if (!customFee) return null;

  if (typeof customFee === 'object') {
    // Standardize on residence_type (database convention)
    const resType = (student.residence_type || student.residenceType || 'day').toLowerCase();
    const fee = Number(customFee[resType]) || Number(customFee.day);
    return fee || null;
  }
  
  return Number(customFee) || null;
}



/**
 * Archive a student record (Soft Delete).
 * Transfers the student to a specific inactive category like 'Transferred' or 'Graduated'.
 */


/**
 * Fetch all payments for a specific student in the current period.
 */
export async function getStudentPayments(studentId) {
  if (!_currentSchoolId || !_currentPeriodId) return [];
  const { data, error } = await supabase
    .from('fee_payments')
    .select('*')
    .eq('school_id', _currentSchoolId)
    .eq('student_id', studentId)
    .eq('period_id', _currentPeriodId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Void a payment record (Soft Delete for finance).
 * Reverses the payment amount from the student's balance.
 */
export async function voidPayment(paymentId, reason) {
  mutationGuard('voidPayment');
  
  // 1. Get the payment to know the amount and student
  const { data: payment, error: pErr } = await supabase
    .from('fee_payments')
    .select('*')
    .eq('id', paymentId)
    .single();
    
  if (pErr) throw pErr;
  if (payment.status === 'Voided') throw new Error('Payment is already voided.');

  // 2. Mark as voided
  const { error: vErr } = await supabase
    .from('fee_payments')
    .update({ 
      status: 'Voided',
      notes: reason ? `VOIDED: ${reason}` : 'Voided by Admin'
    })
    .eq('id', paymentId);
    
  if (vErr) throw vErr;

  // 3. Trigger reconciliation for this student to fix the running balance
  await reconcileStudentFeesWithPayments(payment.student_id);
  
  await logPlatformActivity('PAYMENT_VOID', `Voided payment of ${payment.amount} for Student ID: ${payment.student_id}. Reason: ${reason}`);
}

/**
 * Restore a voided payment (undo an accidental void).
 * Re-applies the payment amount to the student's balance.
 */
export async function restorePayment(paymentId) {
  mutationGuard('restorePayment');
  
  // 1. Get the payment
  const { data: payment, error: pErr } = await supabase
    .from('fee_payments')
    .select('*')
    .eq('id', paymentId)
    .single();
    
  if (pErr) throw pErr;
  if (payment.status !== 'Voided') throw new Error('Only voided payments can be restored.');

  // 2. Mark as restored (back to Success)
  const previousNotes = payment.notes || '';
  const { error: rErr } = await supabase
    .from('fee_payments')
    .update({ 
      status: 'Success',
      notes: previousNotes ? `${previousNotes} | RESTORED on ${new Date().toISOString().split('T')[0]}` : `RESTORED on ${new Date().toISOString().split('T')[0]}`
    })
    .eq('id', paymentId);
    
  if (rErr) throw rErr;

  // 3. Re-reconcile the student's balance
  await reconcileStudentFeesWithPayments(payment.student_id);
  
  await logPlatformActivity('PAYMENT_RESTORE', `Restored voided payment of ${payment.amount} for Student ID: ${payment.student_id}`);
}

/**
 * Hard-reconciliation: Recalculates the student's total paid amount
 * based on all non-voided fee_payments records.
 */
export async function reconcileStudentFeesWithPayments(studentId) {
  mutationGuard('reconcileStudentFeesWithPayments');
  
  // 1. Get all valid payments
  const { data: payments, error: pErr } = await supabase
    .from('fee_payments')
    .select('amount')
    .eq('student_id', studentId)
    .eq('period_id', _currentPeriodId)
    .neq('status', 'Voided');
    
  if (pErr) throw pErr;
  
  const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);

  // 2. Get current fee record to find total_fee
  const { data: feeRecord, error: fErr } = await supabase
    .from('fees')
    .select('total_fee')
    .eq('student_id', studentId)
    .eq('period_id', _currentPeriodId)
    .single();
    
  if (fErr) throw fErr;

  // 3. Update the fees table with the verified totals
  const { error: uErr } = await supabase
    .from('fees')
    .update({
      paid: totalPaid,
      balance: Number(feeRecord.total_fee) - totalPaid
    })
    .eq('student_id', studentId)
    .eq('period_id', _currentPeriodId);
    
  if (uErr) throw uErr;
  
  invalidateCache(`fees_${_currentSchoolId}_${_currentPeriodId}`);
}

/**
 * Update all students in the database to match the current grade-based fee structure.
 * This is called when the school admin updates the fee structure in Settings.
 */
export async function applyFeeStructure() {
  if (!_currentSchoolId || !_currentPeriodId) return;
  const profile = await getSchoolProfile();
  const gradeFees = profile.gradeFees || {};
  const students = await getStudents();
  
  for (const student of students) {
    const finalFee = getCalculatedTotalFee(student, profile);
    
    // Skip students without configured fees to avoid corrupting records
    if (finalFee === null) continue;

    // Get current fee record for THIS period
    const { data: currentFee } = await supabase
      .from('fees')
      .select('paid')
      .eq('student_id', student.id)
      .eq('period_id', _currentPeriodId)
      .maybeSingle();
      
    const paid = currentFee ? Number(currentFee.paid) : 0;
    const newBalance = finalFee - paid;

    await supabase
      .from('fees')
      .upsert({
        school_id: _currentSchoolId,
        student_id: student.id,
        period_id: _currentPeriodId,
        total_fee: finalFee,
        paid: paid,
        balance: newBalance
      }, { onConflict: 'student_id,period_id' });
  }
}



// ============= ATTENDANCE =============
export async function getAttendance() {
  if (!_currentSchoolId || !_currentPeriodId) return {};
  const cacheKey = `att_${_currentSchoolId}_${_currentPeriodId}`;
  return cachedQuery(cacheKey, async () => {
    const { data, error } = await supabase
      .from('attendance')
      .select('id, student_id, date, status, period_id, school_id')
      .eq('school_id', _currentSchoolId)
      .eq('period_id', _currentPeriodId);
    if (error) throw error;
    // Convert to { date: { studentId: status } }
    const att = {};
    (data || []).forEach(row => {
      if (!att[row.date]) att[row.date] = {};
      att[row.date][row.student_id] = row.status;
    });
    return att;
  });
}

export async function markAttendance(date, studentId, status) {
  const { error } = await supabase
    .from('attendance')
    .upsert(
      { school_id: _currentSchoolId, date, student_id: studentId, status, period_id: _currentPeriodId },
      { onConflict: 'school_id,date,student_id,period_id' }
    );
  if (error) throw error;
}

export async function getAttendanceSummary(date, preFetchedAttendance = null) {
  const att = preFetchedAttendance || await getAttendance();
  const entries = Object.values(att[date] || {});
  const present = entries.filter(v => v === 'present').length;
  const late = entries.filter(v => v === 'late').length;
  const absent = entries.filter(v => v === 'absent').length;
  const total = entries.length;
  const percentage = total > 0 ? (((present + late) / total) * 100).toFixed(1) : 0;
  return { present, late, absent, total, percentage: Number(percentage) };
}

export function getTodayStr() { return new Date().toISOString().split('T')[0]; }

// ============= CBC COMPETENCIES =============
export async function getCBC() {
  if (!_currentSchoolId || !_currentPeriodId) return {};
  const { data, error } = await supabase
    .from('cbc_assessments')
    .select('student_id, subject, level')
    .eq('school_id', _currentSchoolId)
    .eq('period_id', _currentPeriodId);
  if (error) throw error;
  const cbc = {};
  (data || []).forEach(row => {
    if (!cbc[row.student_id]) cbc[row.student_id] = {};
    cbc[row.student_id][row.subject] = row.level;
  });
  return cbc;
}

export async function setCBC(studentId, subject, level) {
  await supabase
    .from('cbc_assessments')
    .upsert(
      { school_id: _currentSchoolId, student_id: studentId, subject, level, period_id: _currentPeriodId },
      { onConflict: 'school_id,student_id,subject,period_id' }
    );
}

// ============= CORE COMPETENCIES =============
export async function getCoreCompetencies() {
  if (!_currentSchoolId || !_currentPeriodId) return {};
  const { data, error } = await supabase
    .from('core_competencies')
    .select('id, student_id, competency, level, period_id, school_id')
    .eq('school_id', _currentSchoolId)
    .eq('period_id', _currentPeriodId);
  if (error) throw error;
  const cc = {};
  (data || []).forEach(row => {
    if (!cc[row.student_id]) cc[row.student_id] = {};
    cc[row.student_id][row.competency] = row.level;
  });
  return cc;
}

export async function setCoreCompetency(studentId, competency, level) {
  await supabase
    .from('core_competencies')
    .upsert(
      { school_id: _currentSchoolId, student_id: studentId, competency, level, period_id: _currentPeriodId },
      { onConflict: 'school_id,student_id,competency,period_id' }
    );
}

// ============= SCHOOL STRUCTURE =============
export async function getSchoolStructure(preFetchedStudents = null, preFetchedMarks = null, preFetchedProfile = null) {
  const students = preFetchedStudents || await getStudents();
  const marks = preFetchedMarks || await getMarks();
  const profile = preFetchedProfile || await getSchoolProfile();
  const activeClasses = profile.activeClasses || [];
  const structure = {};

  for (const [levelName, levelData] of Object.entries(CBC_STRUCTURE)) {
    // Filter grades to only those active in this school
    const activeGradesForLevel = levelData.grades.filter(g => activeClasses.includes(g));
    
    // If no grades in this level are active, skip the level
    if (activeGradesForLevel.length === 0) continue;

    const levelStudents = students.filter(s => activeGradesForLevel.includes(s.class));
    const grades = {};
    for (const g of activeGradesForLevel) {
      const gradeStudents = students.filter(s => s.class === g);
      const subjects = getSubjectsForGrade(g, profile);
      const gradeMarks = gradeStudents.map(s => {
        const m = marks[s.id] || {};
        const vals = Array.isArray(subjects) ? subjects.map(sub => m[sub] || 0).filter(v => v > 0) : [];
        return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      }).filter(a => a > 0);
      const avgPerf = gradeMarks.length > 0 ? (gradeMarks.reduce((a, b) => a + b, 0) / gradeMarks.length).toFixed(1) : 0;
      grades[g] = { count: gradeStudents.length, avgPerformance: Number(avgPerf) };
    }
    structure[levelName] = {
      ...levelData,
      totalStudents: levelStudents.length,
      grades,
    };
  }
  return structure;
}



export async function getSubjectAssignments() {
  if (!_currentSchoolId || !_currentPeriodId) return {};

  // [UNIFICATION] Fetch from the robust teacher_assignments table (Domain 16A)
  // instead of the legacy subject_assignments table.
  const { data, error } = await supabase
    .from('teacher_assignments')
    .select('teacher_id, subject, stream:class_streams(name, level)')
    .eq('school_id', _currentSchoolId)
    .eq('period_id', _currentPeriodId)
    .eq('is_active', true);

  if (error) {
    console.warn('[STORE] getSubjectAssignments fetch error:', error.message);
    return {};
  }

  // Convert to legacy nested structure: { classGrade: { stream: { subject: teacherId } } }
  const assignments = {};
  (data || []).forEach(row => {
    const classGrade = row.stream?.level;
    const streamName = row.stream?.name || 'General';
    if (!classGrade) return;

    if (!assignments[classGrade]) assignments[classGrade] = {};
    if (!assignments[classGrade][streamName]) assignments[classGrade][streamName] = {};
    assignments[classGrade][streamName][row.subject] = row.teacher_id;
  });
  return assignments;
}

export async function getTeacherForSubject(classGrade, stream, subject) {
  const assignments = await getSubjectAssignments();
  let teacherId = null;
  if (assignments[classGrade] && assignments[classGrade][stream]) {
    teacherId = assignments[classGrade][stream][subject];
  }
  if (!teacherId) return null;
  const teachers = await getTeachers();
  return teachers.find(t => t.id === teacherId) || null;
}

export async function getClassSubjectAssignments(schoolId, periodId, classGrade, stream = null) {
  // [UNIFICATION] Query from teacher_assignments (Domain 16A)
  let query = supabase
    .from('teacher_assignments')
    .select('*, stream:class_streams!inner(*)')
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .eq('is_active', true)
    .eq('stream.level', classGrade);
  
  if (stream) {
    query = query.eq('stream.name', stream);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  // Format to match the legacy record structure { class_grade, stream, subject, teacher_id }
  return (data || []).map(row => ({
    school_id: row.school_id,
    period_id: row.period_id,
    class_grade: row.stream?.level,
    stream: row.stream?.name,
    subject: row.subject,
    teacher_id: row.teacher_id
  }));
}

export async function saveClassSubjectAssignment(schoolId, periodId, assignment) {
  const { error } = await supabase
    .from('subject_assignments')
    .upsert({
      school_id: schoolId,
      period_id: periodId,
      class_grade: assignment.class_grade,
      stream: assignment.stream || null,
      subject: assignment.subject,
      teacher_id: assignment.teacher_id || null
    }, { onConflict: 'school_id,period_id,class_grade,stream,subject' });
  if (error) throw error;
}

export async function getTTPeriods() {
  if (!_currentSchoolId) return [];
  const { data, error } = await supabase
    .from('tt_periods')
    .select('*')
    .eq('school_id', _currentSchoolId)
    .order('order_index');
  if (error) throw error;
  return data || [];
}

export async function saveTTPeriod(period) {
  mutationGuard('saveTTPeriod');
  if (!_currentSchoolId) throw new Error('No school context');
  const payload = { ...period, school_id: _currentSchoolId };
  if (period.id) {
    const { data, error } = await supabase.from('tt_periods').update(payload).eq('id', period.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('tt_periods').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTTPeriod(id) {
  mutationGuard('deleteTTPeriod');
  const { error } = await supabase.from('tt_periods').delete().eq('id', id);
  if (error) throw error;
}

export async function getTTSubjects() {
  if (!_currentSchoolId) return [];
  const { data, error } = await supabase
    .from('tt_subjects')
    .select('*')
    .eq('school_id', _currentSchoolId)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function saveTTSubject(subject) {
  mutationGuard('saveTTSubject');
  if (!_currentSchoolId) throw new Error('No school context');
  const payload = { ...subject, school_id: _currentSchoolId };
  if (subject.id) {
    const { data, error } = await supabase.from('tt_subjects').update(payload).eq('id', subject.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('tt_subjects').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function getTTTeacherSubjects(classId = null) {
  if (!_currentSchoolId) return [];
  let q = supabase
    .from('tt_teacher_subjects')
    .select('*, users(name), tt_subjects(name, short_code), classes(name, stream)')
    .eq('school_id', _currentSchoolId);
  if (classId) q = q.eq('class_id', classId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function saveTTTeacherSubject({ teacherId, subjectId, classId }) {
  mutationGuard('saveTTTeacherSubject');
  if (!_currentSchoolId) throw new Error('No school context');
  const { data, error } = await supabase
    .from('tt_teacher_subjects')
    .upsert({ school_id: _currentSchoolId, teacher_id: teacherId, subject_id: subjectId, class_id: classId },
      { onConflict: 'teacher_id,subject_id,class_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ================================
// STUB EXPORTS — Referenced by UI components but not yet implemented.
// These prevent build failures and return safe defaults.
// ================================

export async function initializeStreams() {
  console.warn('[academicsStore] initializeStreams is not yet implemented');
  return [];
}

export async function deleteAllExams() {
  console.warn('[academicsStore] deleteAllExams is not yet implemented');
  return [];
}

export async function previewClassPromotion() {
  console.warn('[academicsStore] previewClassPromotion is not yet implemented');
  return { promoted: [], retained: [] };
}

export async function promoteClasses() {
  console.warn('[academicsStore] promoteClasses is not yet implemented');
  return { promoted: 0, retained: 0 };
}

export async function getOpenExamsForTeacher() {
  console.warn('[academicsStore] getOpenExamsForTeacher is not yet implemented');
  return [];
}

export async function getVirtualPaperMarks() {
  console.warn('[academicsStore] getVirtualPaperMarks is not yet implemented');
  return [];
}

export async function getTeacherAssignments() {
  console.warn('[academicsStore] getTeacherAssignments is not yet implemented');
  return [];
}

export async function assignTeacher() {
  console.warn('[academicsStore] assignTeacher is not yet implemented');
  return null;
}

export async function removeTeacherAssignment() {
  console.warn('[academicsStore] removeTeacherAssignment is not yet implemented');
  return null;
}

export async function getClassStreams() {
  console.warn('[academicsStore] getClassStreams is not yet implemented');
  return [];
}
