import Dexie from 'dexie';

export const db = new Dexie('ShuleSoftOffline');

// Schema definition
db.version(1).stores({
  students: 'id, school_id, name, adm_no, class, status',
  marks: '[period_id+student_id+subject], period_id, student_id, school_id',
  attendance: 'id, date, school_id, class_id',
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
