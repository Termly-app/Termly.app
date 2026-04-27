import { supabase } from '../lib/supabase';
import { 
  _currentSchoolId, 
  _currentPeriodId, 
  _currentUserId, 
  _currentAuthUser, 
  mutationGuard, 
  cachedQuery, 
  invalidateCache,
  getUserByAuthId,
  getSchoolProfile,
  logPlatformActivity,
  logAuditEvent,
  _currentExamType
} from './store';
import { getSubjectsForGrade } from './seedData';
import { sendEmail, emailTemplates } from '../utils/email';

const defaultProgressionMap = {
  'Playgroup': 'PP1',
  'PP1': 'PP2',
  'PP2': 'Grade 1',
  'Grade 1': 'Grade 2',
  'Grade 2': 'Grade 3',
  'Grade 3': 'Grade 4',
  'Grade 4': 'Grade 5',
  'Grade 5': 'Grade 6',
  'Grade 6': 'Grade 7',
  'Grade 7': 'Grade 8',
  'Grade 8': 'Grade 9',
  'Grade 9': 'Grade 10',
  'Grade 10': 'Grade 11',
  'Grade 11': 'Grade 12',
  'Grade 12': 'Graduated',
  'Form 1': 'Form 2',
  'Form 2': 'Form 3',
  'Form 3': 'Form 4',
  'Form 4': 'Graduated'
};

export async function getExams() {
  if (!_currentSchoolId) return [];
  
  // Portal mode: strictly identify portal users via sessionStorage
  const isPortalUser = !!sessionStorage.getItem('shulesoft_portal_user_id');
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
    const isTeacherPortal = !!sessionStorage.getItem('shulesoft_teacher_id');
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

export async function deleteAllExams() {
  mutationGuard('deleteAllExams');
  if (!_currentSchoolId) return;
  const { error } = await supabase
    .from('exams')
    .delete()
    .eq('school_id', _currentSchoolId);
  
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
  
  invalidateCache(`exams_${_currentSchoolId}`);
  return true;
}

export async function releaseExamToParents(examId, isReleased = true) {
  const { data: exam, error: fetchErr } = await supabase.from('exams').select('name').eq('id', examId).single();
  
  const { error } = await supabase
    .from('exams')
    .update({ released_to_parents: isReleased })
    .eq('id', examId);
  if (error) throw error;

  if (isReleased && exam) {
    // Send Results Published Email to parents (via bulk notification engine)
    // For now, trigger a log and we'll assume the Edge Function handles the broadcast
    await logAuditEvent('results_released_to_parents', 'exams', examId, { name: exam.name });
    
    // Notify admin that broadcast is starting
    if (_currentAuthUser?.email) {
      await sendEmail({
        to: _currentAuthUser.email,
        subject: `Results Released: ${exam.name}`,
        template: emailTemplates.RESULTS_PUBLISHED,
        data: { examName: exam.name }
      });
    }
  }

  invalidateCache(`exams_${_currentSchoolId}`);
  return true;
}

export async function openExamForTeacherEntry(examId, deadline = null) {
  const { data: exam } = await supabase.from('exams').select('name').eq('id', examId).single();
  
  const { error } = await supabase
    .from('exams')
    .update({ teacher_entry_open: true, teacher_entry_deadline: deadline })
    .eq('id', examId);
  if (error) throw error;

  if (exam) {
    await logAuditEvent('teacher_entry_opened', 'exams', examId, { name: exam.name, deadline });
    // Email teachers (broadcast logic in Edge Function)
  }
  
  invalidateCache(`exams_${_currentSchoolId}`);
  return true;
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

  // If in portal mode (no auth user but school id set), use RPC
  if (!_currentAuthUser && _currentSchoolId) {
    const { data, error } = await supabase.rpc('portal_get_student_results_v2', { p_student_id: studentId });
    if (error) throw error;
    // Map flat TABLE results to nested structure expected by UI
    return (data || []).map(r => ({
      ...r,
      exams: {
        name: r.exam_name,
        term: r.exam_term,
        exam_type: r.exam_type
      }
    }));
  }

  const { data, error } = await supabase
    .from('exam_results')
    .select('*, exams(name, term, exam_type)')
    .eq('student_id', studentId);
  
  if (error) throw error;
  // Supabase join filtering might return null for exams if status != published
  // Filter out those where join returned null
  return (data || []).filter(r => r.exams);
}

export async function getStudentProfile(studentId) {
  if (!_currentSchoolId || !studentId) return null;

  // If in portal mode (no auth user but school id set), use RPC
  if (!_currentAuthUser && _currentSchoolId) {
    const { data, error } = await supabase.rpc('portal_get_student_profile', { p_student_id: studentId });
    if (error) {
      console.warn('Portal student profile fetch error:', error.message);
      return null;
    }
    return data || null;
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
  const { data, error } = await supabase.rpc('portal_get_subject_details', { p_student_id: studentId });
  if (error) {
    console.warn('Subject details fetch error:', error.message);
    return [];
  }
  return data || [];
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
        class_id: m.exam_papers.class_id 
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

/**
 * Domain 16A: Academic Data Model Management
 */
export async function getClassStreams(level = null, year = null) {
  if (!_currentSchoolId) return [];
  let query = supabase
    .from('class_streams')
    .select('*')
    .eq('school_id', _currentSchoolId);
  
  if (level) query = query.eq('level', level);
  if (year) query = query.eq('academic_year', year);
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createClassStream(name, level, academicYear, capacity = 40) {
  mutationGuard('createClassStream');
  const { data, error } = await supabase
    .from('class_streams')
    .insert({
      school_id: _currentSchoolId,
      name,
      level,
      academic_year: academicYear,
      capacity
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTeacherAssignments(periodId = _currentPeriodId) {
  if (!_currentSchoolId) return [];
  const { data, error } = await supabase
    .from('teacher_assignments')
    .select('*, teacher:users(name), stream:class_streams(name, level)')
    .eq('school_id', _currentSchoolId)
    .eq('period_id', periodId)
    .eq('is_active', true); // Only active assignments

  if (error) throw error;
  return data || [];
}

export async function assignTeacher(teacherId, streamId, subject, periodId = _currentPeriodId) {
  mutationGuard('assignTeacher');
  if (!_currentSchoolId) throw new Error('No school context');
  
  // Need academic_year to insert properly
  const { data: stream } = await supabase.from('class_streams').select('academic_year').eq('id', streamId).single();
  
  const { data, error } = await supabase
    .from('teacher_assignments')
    .upsert({
      school_id: _currentSchoolId,
      teacher_id: teacherId,
      stream_id: streamId,
      subject,
      period_id: periodId,
      academic_year: stream?.academic_year || new Date().getFullYear(),
      is_active: true
    }, { onConflict: 'school_id, teacher_id, stream_id, subject, period_id' })
    .select()
    .single();

  if (error) throw error;
  
  await logPlatformActivity('TEACHER_ASSIGNED', `Assigned teacher ${teacherId} to stream ${streamId} for ${subject}`);
  return data;
}

export async function removeTeacherAssignment(assignmentId) {
  mutationGuard('removeTeacherAssignment');
  const { error } = await supabase
    .from('teacher_assignments')
    .update({ is_active: false })
    .eq('id', assignmentId);

  if (error) throw error;
  await logPlatformActivity('TEACHER_REASSIGNED', `Removed assignment ${assignmentId}`);
}

export async function getSubjectConfigurations(level) {
  if (!_currentSchoolId) return null;
  const { data, error } = await supabase
    .from('subject_configurations')
    .select('*')
    .eq('school_id', _currentSchoolId)
    .eq('level', level)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateSubjectConfig(level, subjects) {
  mutationGuard('updateSubjectConfig');
  const { data, error } = await supabase
    .from('subject_configurations')
    .upsert({
      school_id: _currentSchoolId,
      level,
      subjects,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function publishExamForTeacherEntry(examSessionId, deadline = null) {
  mutationGuard('publishExamForTeacherEntry');
  const { data, error } = await supabase
    .from('exam_publish_settings')
    .upsert({
      exam_session_id: examSessionId,
      school_id: _currentSchoolId,
      teacher_entry_open: true,
      teacher_entry_deadline: deadline,
      updated_at: new Date().toISOString()
    }, { onConflict: 'exam_session_id' })
    .select()
    .single();

  if (error) throw error;

  // Log to audit_logs (Domain 6 placeholder)
  // await logAuditEvent('results_released_to_teachers', 'exam_sessions', examSessionId, { deadline });
  return data;
}

export async function releaseResultsToParents(examSessionId) {
  mutationGuard('releaseResultsToParents');
  const { data, error } = await supabase
    .from('exam_publish_settings')
    .upsert({
      exam_session_id: examSessionId,
      school_id: _currentSchoolId,
      results_released_to_parents: true,
      results_released_at: new Date().toISOString(),
      released_by: _currentAuthUser?.id,
      updated_at: new Date().toISOString()
    }, { onConflict: 'exam_session_id' })
    .select()
    .single();

  if (error) throw error;

  // Log to audit_logs (Domain 6 placeholder)
  // await logAuditEvent('results_released_to_parents', 'exam_sessions', examSessionId, {});
  return data;
}

export async function retractExamResults(examSessionId) {
  mutationGuard('retractExamResults');
  const { data, error } = await supabase
    .from('exam_publish_settings')
    .upsert({
      exam_session_id: examSessionId,
      school_id: _currentSchoolId,
      teacher_entry_open: false,
      results_released_to_parents: false,
      updated_at: new Date().toISOString()
    }, { onConflict: 'exam_session_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getOpenExamsForTeacher() {
  if (!_currentSchoolId) return [];
  // Uses a join to get exams that have teacher_entry_open = true in exam_publish_settings
  const { data, error } = await supabase
    .from('exams')
    .select('id, name, term, exam_type, status, exam_publish_settings!inner(teacher_entry_open)')
    .eq('school_id', _currentSchoolId)
    .eq('exam_publish_settings.teacher_entry_open', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function previewClassPromotion(fromYear, toYear) {
  if (!_currentSchoolId) throw new Error('No school context');

  const profile = await getSchoolProfile();
  const map = profile?.platform_settings?.grade_progression_map || defaultProgressionMap;

  // 1. Get active streams for fromYear
  const { data: streams, error: streamErr } = await supabase
    .from('class_streams')
    .select('*')
    .eq('school_id', _currentSchoolId)
    .eq('academic_year', fromYear)
    .eq('is_active', true);
  
  if (streamErr) throw streamErr;

  // 2. Get students in those streams
  const { data: students, error: stdErr } = await supabase
    .from('students')
    .select('id, name, stream_id, status')
    .eq('school_id', _currentSchoolId)
    .in('stream_id', streams.map(s => s.id));
    
  if (stdErr) throw stdErr;

  // 3. Get teacher assignments for those streams
  const { data: assignments, error: assignErr } = await supabase
    .from('teacher_assignments')
    .select('*, users(name)')
    .eq('school_id', _currentSchoolId)
    .eq('academic_year', fromYear)
    .eq('is_active', true);

  if (assignErr) throw assignErr;

  const preview = {
    streamsPromoted: 0,
    studentsPromoted: 0,
    studentsGraduated: 0,
    teachersCarriedForward: 0,
    details: []
  };

  for (const stream of streams) {
    const targetLevel = map[stream.level];
    const isOffered = profile?.activeClasses?.includes(targetLevel);
    const nextLevel = (isOffered && targetLevel !== 'Graduated') ? targetLevel : 'Graduated';

    const streamStudents = students.filter(s => s.stream_id === stream.id && s.status !== 'graduated');
    const streamAssignments = assignments.filter(a => a.stream_id === stream.id);

    if (!targetLevel) {
      preview.details.push({ stream: `${stream.level} ${stream.name}`, status: 'No mapping found, skipping.' });
      continue;
    }

    if (nextLevel === 'Graduated') {
      preview.studentsGraduated += streamStudents.length;
      preview.details.push({
        stream: `${stream.level} ${stream.name}`,
        status: targetLevel === 'Graduated' 
          ? `Graduating ${streamStudents.length} students.`
          : `Graduating ${streamStudents.length} students (Target level ${targetLevel} is not offered by this school).`
      });
    } else {
      preview.streamsPromoted++;
      preview.studentsPromoted += streamStudents.length;
      preview.teachersCarriedForward += streamAssignments.length;
      preview.details.push({
        stream: `${stream.level} ${stream.name} -> ${nextLevel} ${stream.name}`,
        status: `Promoting ${streamStudents.length} students and carrying forward ${streamAssignments.length} teacher assignments.`
      });
    }
  }

  return preview;
}

export async function promoteClasses(fromYear, toYear) {
  mutationGuard('promoteClasses');
  if (!_currentSchoolId) throw new Error('No school context');

  const profile = await getSchoolProfile();
  const map = profile?.platform_settings?.grade_progression_map || defaultProgressionMap;

  // Re-fetch to ensure data integrity during mutation
  const { data: streams } = await supabase.from('class_streams').select('*')
    .eq('school_id', _currentSchoolId).eq('academic_year', fromYear).eq('is_active', true);
  
  if (!streams || streams.length === 0) return { success: true, message: 'No active streams found to promote.' };

  const { data: students } = await supabase.from('students').select('*')
    .eq('school_id', _currentSchoolId).in('stream_id', streams.map(s => s.id));
    
  const { data: assignments } = await supabase.from('teacher_assignments').select('*')
    .eq('school_id', _currentSchoolId).eq('academic_year', fromYear).eq('is_active', true);

  let promotedStreams = 0;
  let graduatedStudents = 0;

  for (const stream of streams) {
    const targetLevel = map[stream.level];
    const isOffered = profile?.activeClasses?.includes(targetLevel);
    const nextLevel = (isOffered && targetLevel !== 'Graduated') ? targetLevel : 'Graduated';

    const streamStudents = students.filter(s => s.stream_id === stream.id && s.status !== 'graduated');
    const streamAssignments = assignments.filter(a => a.stream_id === stream.id);

    if (!targetLevel) continue;

    if (nextLevel === 'Graduated') {
      // Graduate students
      if (streamStudents.length > 0) {
        await supabase.from('students')
          .update({ status: 'graduated', stream_id: null, updated_at: new Date().toISOString() })
          .in('id', streamStudents.map(s => s.id));
        graduatedStudents += streamStudents.length;
      }
    } else {
      // 1. Create new stream
      const { data: newStream, error: newStreamErr } = await supabase.from('class_streams')
        .insert({
          school_id: _currentSchoolId,
          name: stream.name,
          level: nextLevel,
          academic_year: toYear,
          capacity: stream.capacity,
          is_active: true
        }).select().single();
      
      if (newStreamErr) throw newStreamErr;

      // 2. Move students
      if (streamStudents.length > 0) {
        await supabase.from('students')
          .update({ stream_id: newStream.id, class: nextLevel, updated_at: new Date().toISOString() })
          .in('id', streamStudents.map(s => s.id));
      }

      // 3. Carry forward teachers
      if (streamAssignments.length > 0) {
        const newAssignments = streamAssignments.map(a => ({
          school_id: _currentSchoolId,
          teacher_id: a.teacher_id,
          stream_id: newStream.id,
          subject: a.subject,
          period_id: a.period_id, // Note: Period continuity will update this later or we can assume it carries forward.
          academic_year: toYear,
          is_active: true
        }));
        await supabase.from('teacher_assignments').insert(newAssignments);
      }
      promotedStreams++;
    }
  }

  await logPlatformActivity('CLASS_PROMOTED', `Promoted academic year ${fromYear} to ${toYear}`);
  
  // Also log to audit_logs
  await supabase.from('audit_logs').insert({
    school_id: _currentSchoolId,
    action_type: 'UPDATE',
    table_name: 'class_streams',
    new_data: { fromYear, toYear, promotedStreams, graduatedStudents }
  });

  return { success: true, promotedStreams, graduatedStudents };
}

export function isCurrentPeriod(periodId) {
  return String(periodId) === String(_currentPeriodId);
}

export async function carryForwardTeacherAssignments(fromPeriodId, toPeriodId) {
  mutationGuard('carryForwardTeacherAssignments');
  if (!_currentSchoolId) throw new Error('No school context');

  const { data: assignments, error: fetchErr } = await supabase
    .from('teacher_assignments')
    .select('*')
    .eq('school_id', _currentSchoolId)
    .eq('period_id', fromPeriodId)
    .eq('is_active', true);

  if (fetchErr) throw fetchErr;
  if (!assignments || assignments.length === 0) return { success: true, count: 0 };

  const newAssignments = assignments.map(a => ({
    school_id: _currentSchoolId,
    teacher_id: a.teacher_id,
    stream_id: a.stream_id,
    subject: a.subject,
    period_id: toPeriodId,
    academic_year: a.academic_year,
    is_active: true
  }));

  const { error: insertErr } = await supabase
    .from('teacher_assignments')
    .upsert(newAssignments, { onConflict: 'school_id, teacher_id, stream_id, subject, period_id' });

  if (insertErr) throw insertErr;
  await logPlatformActivity('TEACHER_ASSIGNMENTS_CARRIED_FORWARD', `Copied ${assignments.length} assignments from period ${fromPeriodId} to ${toPeriodId}`);
  return { success: true, count: assignments.length };
}


/**
 * Initial setup of streams for a new school or a school with no existing streams for the year.
 */
export async function initializeStreams(year) {
  mutationGuard('initializeStreams');
  if (!_currentSchoolId) throw new Error('No school context');

  const profile = await getSchoolProfile();
  const activeClasses = profile?.active_classes || profile?.activeClasses || [];
  const streamsPerClass = profile?.streams_per_class || profile?.streamsPerClass || {};

  if (activeClasses.length === 0) return { success: true, message: 'No active classes configured.' };

  // Fetch all existing streams for this year
  const { data: existing } = await supabase.from('class_streams')
    .select('name, level').eq('school_id', _currentSchoolId).eq('academic_year', year);
  
  const existingMap = new Set((existing || []).map(s => `${s.level}:${s.name}`));

  const newStreams = [];
  for (const grade of activeClasses) {
    const streams = streamsPerClass[grade] || ['General'];
    for (const name of streams) {
      if (!existingMap.has(`${grade}:${name}`)) {
        newStreams.push({
          school_id: _currentSchoolId,
          name: name,
          level: grade,
          academic_year: year,
          is_active: true
        });
      }
    }
  }

  if (newStreams.length > 0) {
    const { error } = await supabase.from('class_streams').insert(newStreams);
    if (error) throw error;
    return { success: true, count: newStreams.length, message: `Added ${newStreams.length} new streams.` };
  }

  return { success: true, count: 0, message: 'All streams are already up to date.' };
}
