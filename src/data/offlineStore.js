import Dexie from 'dexie';

export const db = new Dexie('ShuleSoftOffline');

// Schema definition
db.version(4).stores({
  students: 'id, school_id, name, adm_no, class, status, residence_type',
  teachers: 'id, school_id, name, on_leave',
  marks: '[period_id+student_id+subject], period_id, student_id, school_id',
  attendance: 'id, date, school_id, class_id',
  communications: '++id, type, target, timestamp, user',
  assignments: '++id, class, subject, title, deadline, timestamp, teacher',
  submissions: '++id, assignment_id, student_id, student_name, class, status, timestamp, [assignment_id+student_id]',
  syncQueue: '++id, type, payload, status, created_at'
});

export const syncTypes = {
  ADD_STUDENT: 'ADD_STUDENT',
  UPDATE_STUDENT: 'UPDATE_STUDENT',
  ADD_MARK: 'ADD_MARK',
  UPDATE_MARK: 'UPDATE_MARK',
  UPLOAD_FEE: 'UPLOAD_FEE'
};

/**
 * Queue a change for background synchronization
 */
export async function queueChange(type, payload) {
  return await db.syncQueue.add({
    type,
    payload,
    status: 'pending',
    created_at: new Date().toISOString()
  });
}

/**
 * Get pending sync items
 */
export async function getPendingSync() {
  return await db.syncQueue.where('status').equals('pending').toArray();
}

/**
 * Get count of pending sync items
 */
export async function getPendingSyncCount() {
  return await db.syncQueue.where('status').equals('pending').count();
}

/**
 * Mark item as synced or failed
 */
export async function updateSyncStatus(id, status, error = null) {
  return await db.syncQueue.update(id, { status, error, synced_at: new Date().toISOString() });
}

/**
 * Validate Portal authentication by checking local offlineStore for student
 * In production, this would make an anonymous query to Supabase.
 */
export async function validatePortalLogin(schoolSearch, admNo) {
  // Try to find a student who matches the ADM number exactly
  const students = await db.students.where('adm_no').equalsIgnoreCase(admNo).toArray();
  
  if (students.length === 0) return null;
  // If we had the school context, we'd filter by it. We just mock success with the first find.
  const student = students[0];
  
  // Try to find outstanding fees or communication history
  const allComms = await db.communications.orderBy('timestamp').reverse().toArray();
  
  return {
    id: student.id,
    name: student.name,
    class: student.class,
    adm_no: student.adm_no,
    residence_type: student.residence_type || 'day',
    recent_comms: allComms.slice(0, 5) // Last 5 notices
  };
}

// ==========================================
// LMS HELPERS
// ==========================================
export async function addAssignment(payload) {
  return await db.assignments.add({ ...payload, timestamp: new Date().toISOString() });
}

export async function getAssignments(className = null) {
  const all = await db.assignments.orderBy('timestamp').reverse().toArray();
  if (className) return all.filter(a => a.class === className);
  return all;
}

export async function submitAssignment(assignment_id, student, payload) {
  return await db.submissions.add({
    assignment_id,
    student_id: student.id,
    student_name: student.name,
    class: student.class,
    payload,
    status: 'submitted',
    timestamp: new Date().toISOString()
  });
}

export async function getSubmissions(assignment_id) {
  return await db.submissions.where('assignment_id').equals(assignment_id).toArray();
}

export async function getStudentSubmissions(student_id) {
  return await db.submissions.where('student_id').equals(student_id).toArray();
}
