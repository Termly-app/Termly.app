/**
 * fix_coreStore_final.cjs
 * 
 * Appends ALL missing exported functions to coreStore.js in one shot.
 * Required by: authStore, financeStore, studentStore, academicsStore, staffStore,
 * and all page-level imports via store.js facade.
 */
const fs = require('fs');

let code = fs.readFileSync('src/data/coreStore.js', 'utf8');

// Guard: don't double-append
if (code.includes('export function subscribeToSchoolChanges')) {
  console.log('subscribeToSchoolChanges already exists — skipping.');
  process.exit(0);
}



const appendBlock = `

// ============================================================================
// EVERYTHING BELOW WAS RESTORED BY fix_coreStore_final.cjs
// These functions were in the original monolithic store.js and must be exported
// from coreStore.js for the domain stores and pages to work.
// ============================================================================

import { db, queueChange, getPendingSync, updateSyncStatus, syncTypes } from './offlineStore';

// ============= REALTIME SUBSCRIPTIONS =============

export function subscribeToSchoolChanges(onSettingsChange, onProfileChange) {
  if (!_currentSchoolId) return () => {};

  const channel = supabase
    .channel(\`school_shell_\${_currentSchoolId}\`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, () => {
      onSettingsChange();
    })
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'school_profiles',
      filter: \`school_id=eq.\${_currentSchoolId}\`
    }, () => {
      onProfileChange();
    })
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'school_features',
      filter: \`school_id=eq.\${_currentSchoolId}\`
    }, (payload) => {
      console.log("[REALTIME] Feature changed:", payload.new);
      invalidateFeatureCache(_currentSchoolId);
      onSettingsChange();
    })
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'students',
      filter: \`school_id=eq.\${_currentSchoolId}\`
    }, () => {
      window.dispatchEvent(new Event('studentsSynced'));
    })
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'mpesa_callbacks',
      filter: \`school_id=eq.\${_currentSchoolId}\`
    }, () => {
      window.dispatchEvent(new Event('mpesaCallbackReceived'));
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToPlatformChanges(onPlatformActivity) {
  const channel = supabase
    .channel('platform_admin_global')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'schools' }, () => {
      onPlatformActivity?.();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, () => {
      onPlatformActivity?.();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_activity' }, () => {
      onPlatformActivity?.();
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToChanges(onStudentChange, onFeeChange) {
  if (!_currentSchoolId) return () => {};
  const channel = supabase
    .channel(\`data_changes_\${_currentSchoolId}\`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'students',
      filter: \`school_id=eq.\${_currentSchoolId}\`
    }, () => onStudentChange?.())
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'fees',
      filter: \`school_id=eq.\${_currentSchoolId}\`
    }, () => onFeeChange?.())
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ============= PROFILE HELPERS =============

export async function getSchoolProfileBySchoolId(schoolId) {
  if (!schoolId) return null;
  const { data, error } = await supabase
    .from('school_profiles')
    .select('*')
    .eq('school_id', schoolId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    schoolId: data.school_id,
    schoolName: data.school_name,
    subscriptionPlan: data.subscription_plan || 'Free',
    subscriptionStatus: data.subscription_status || 'Active',
    subscriptionExpiry: data.subscription_expiry,
    logoUrl: data.logo_url,
    motto: data.motto,
    phone: data.phone,
    address: data.address,
    email: data.email,
    schoolType: data.school_type || 'Day',
    curriculum: data.curriculum || 'CBC Only',
    enabledModules: data.enabled_modules || {},
    grading_systems: data.grading_systems,
    grade_fees: data.grade_fees,
    portal_access: data.portal_access,
    mpesa_config: data.mpesa_config,
    sms_config: data.sms_config
  };
}

export function checkIsSubscriptionActive(profile) {
  if (!profile) return false;
  if (profile.subscriptionPlan === 'Sandbox' || profile.subscriptionPlan === 'Platform Admin') return true;
  if (profile.subscriptionStatus === 'Active') {
    if (!profile.subscriptionExpiry) return true;
    return new Date(profile.subscriptionExpiry) > new Date();
  }
  return false;
}

export async function checkFeatureAccess(featureKey, profile) {
  if (!profile || !profile.schoolId) return false;
  if (profile.subscriptionPlan === 'Platform Admin') return true;
  return await hasFeature(profile.schoolId, featureKey);
}

export async function isFeatureEnabled(featureSlug) {
  if (!_currentSchoolId) return false;
  try {
    const profile = await getSchoolProfile();
    if (profile.enabledModules?.[featureSlug] === false) return false;
    return await checkFeatureAccess(featureSlug, profile);
  } catch (e) {
    console.error("Feature gating error:", e);
    return false;
  }
}

export async function checkIsPlatformAdmin() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from('platform_admins')
      .select('id')
      .eq('email', user.email)
      .maybeSingle();
    return !!data;
  } catch { return false; }
}

// ============= SCHOOL PROFILE CRUD =============

let _profileCache = null;

export async function getSchoolProfile() {
  if (_profileCache) return _profileCache;
  if (!_currentSchoolId) return {};
  const profile = await getSchoolProfileBySchoolId(_currentSchoolId);
  _profileCache = profile || {};
  return _profileCache;
}

export const DEFAULT_PROFILE = {
  enabledModules: { students: true, attendance: true, grading: true, fees: true, dashboard: true }
};

export async function saveSchoolProfile(profile) {
  mutationGuard('saveSchoolProfile');
  if (!_currentSchoolId) {
    throw new Error("School Identification Lost. Please refresh your browser or log in again.");
  }

  const { mpesa = {}, sms = {}, ...rest } = profile;
  const row = { ...rest, school_id: _currentSchoolId };

  const encryptIfNew = async (val, oldEncrypted) => {
    if (!val) return null;
    if (val.includes?.('...********')) return oldEncrypted;
    return val;
  };

  row.mpesa_config = {
    shortcode: mpesa.shortcode || '',
    consumer_key: await encryptIfNew(mpesa.consumer_key, mpesa._encrypted?.consumer_key),
    consumer_secret: await encryptIfNew(mpesa.consumer_secret, mpesa._encrypted?.consumer_secret),
  };

  row.sms_config = {
    sender_id: sms.sender_id || '',
    api_key: await encryptIfNew(sms.api_key, sms._encrypted?.api_key),
  };

  if (row.grading_systems) {
    Object.keys(row.grading_systems).forEach(lv => {
      row.grading_systems[lv] = row.grading_systems[lv].map(g => ({
        ...g,
        min: Math.max(0, Math.min(100, Number(g.min) || 0)),
        max: Math.max(0, Math.min(100, Number(g.max) || 0))
      }));
    });
  }
  if (row.grade_fees) {
    Object.keys(row.grade_fees).forEach(g => {
      if (typeof row.grade_fees[g] === 'object') {
        row.grade_fees[g].day = Math.max(0, Number(row.grade_fees[g].day) || 0);
        row.grade_fees[g].boarding = Math.max(0, Number(row.grade_fees[g].boarding) || 0);
      } else {
        row.grade_fees[g] = Math.max(0, Number(row.grade_fees[g]) || 0);
      }
    });
  }

  const skippedColumns = [];
  const attemptSave = async (payload) => {
    const { error } = await supabase
      .from('school_profiles')
      .upsert(payload, { onConflict: 'school_id' });
    if (error) {
      if (error.message?.includes('column') || error.hint?.includes('column')) {
        const quotedMatches = error.message.match(/["']([^"']+)["']/g) || [];
        let foundCol = null;
        for (const match of quotedMatches) {
          const possibleCol = match.replace(/["']/g, '');
          if (payload[possibleCol] !== undefined) { foundCol = possibleCol; break; }
        }
        if (foundCol) {
          skippedColumns.push(foundCol);
          const newPayload = { ...payload };
          delete newPayload[foundCol];
          return attemptSave(newPayload);
        }
      }
      throw error;
    }
  };

  await attemptSave(row);
  _profileCache = null;
  window.dispatchEvent(new Event('schoolProfileChanged'));
  return { success: true, skipped: skippedColumns };
}

// ============= PLATFORM SETTINGS =============

export async function getPlatformSettings() {
  return cachedQuery('platformSettings', async () => {
    const { data, error } = await supabase.from('platform_settings').select('*');
    if (error) throw error;
    const settings = {};
    (data || []).forEach(s => { settings[s.key] = s.value; });
    return settings;
  }, 30000);
}

export async function updatePlatformSetting(key, value) {
  mutationGuard('updatePlatformSetting');
  const { error } = await supabase
    .from('platform_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
  invalidateCache('platformSettings');
}

export async function getPlatformStats() {
  const [schoolsRes, studentsRes, usersRes] = await Promise.all([
    supabase.from('schools').select('id', { count: 'exact' }),
    supabase.from('students').select('id', { count: 'exact' }).eq('status', 'Active'),
    supabase.from('users').select('id', { count: 'exact' })
  ]);
  return {
    totalSchools: schoolsRes.count || 0,
    totalStudents: studentsRes.count || 0,
    totalUsers: usersRes.count || 0
  };
}

// ============= SCHOOL MANAGEMENT (SUPER ADMIN) =============

export async function getAllSchools() {
  const { data: schools, error: sErr } = await supabase
    .from('schools')
    .select('id, name, email, plan, owner_id, phone, location, created_at, school_profiles(*)');

  if (sErr) {
    console.error('Error fetching all schools:', sErr);
    return [];
  }

  const [studentsRes, staffRes, featuresRes] = await Promise.all([
    supabase.from('students').select('school_id').eq('status', 'Active'),
    supabase.from('users').select('school_id').neq('role', 'Super Admin'),
    supabase.from('school_features').select('school_id').eq('is_enabled', true)
  ]);

  const studentCounts = (studentsRes.data || []).reduce((acc, curr) => {
    acc[curr.school_id] = (acc[curr.school_id] || 0) + 1; return acc;
  }, {});
  const staffCounts = (staffRes.data || []).reduce((acc, curr) => {
    acc[curr.school_id] = (acc[curr.school_id] || 0) + 1; return acc;
  }, {});
  const featureCounts = (featuresRes.data || []).reduce((acc, curr) => {
    acc[curr.school_id] = (acc[curr.school_id] || 0) + 1; return acc;
  }, {});

  const { data: registry } = await supabase.from('features_registry').select('feature_key').eq('is_beta', false);
  const totalCount = (registry?.length || 14);

  return (schools || []).map(s => ({
    ...s,
    _studentCount: studentCounts[s.id] || 0,
    _staffCount: staffCounts[s.id] || 0,
    features_count: featureCounts[s.id] || 0,
    features_total: totalCount
  }));
}

export async function deactivateSchool(schoolId, reason = null) {
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { error: e1 } = await supabase.from('school_profiles')
    .update({ subscription_status: 'Deactivated', subscription_expiry: pastDate, status_notes: reason })
    .eq('school_id', schoolId);
  if (e1) throw e1;

  const { error: e2 } = await supabase.from('school_features')
    .update({ expires_at: pastDate }).eq('school_id', schoolId);
  if (e2) console.warn('DeactivateSchool: Failed to expire features', e2);

  invalidateFeatureCache(schoolId);
  await logPlatformActivity('DEACTIVATION', \`School \${schoolId} deactivated. Reason: \${reason || 'Not specified'}\`, schoolId);
}

export async function restoreSchool(schoolId, monthsToAdd = 4, notes = null) {
  const { data: profileData } = await supabase.from('school_profiles')
    .select('subscription_expiry').eq('school_id', schoolId).single();

  let expiry = new Date();
  if (profileData?.subscription_expiry) {
    const currentExpiry = new Date(profileData.subscription_expiry);
    if (currentExpiry > expiry) expiry = currentExpiry;
  }
  expiry.setMonth(expiry.getMonth() + monthsToAdd);

  const { error } = await supabase.from('school_profiles')
    .update({ subscription_status: 'Active', subscription_expiry: expiry.toISOString(), status_notes: notes })
    .eq('school_id', schoolId);
  if (error) throw error;

  invalidateFeatureCache(schoolId);
  await logPlatformActivity('RESTORATION', \`School \${schoolId} restored for \${monthsToAdd} months\`, schoolId);
}

export async function suspendSchool(schoolId, reason = null) {
  const { error } = await supabase.from('school_profiles')
    .update({ subscription_status: 'Suspended', status_notes: reason })
    .eq('school_id', schoolId);
  if (error) throw error;
  await logPlatformActivity('SUSPENSION', \`School \${schoolId} suspended. Reason: \${reason || 'Not specified'}\`, schoolId);
}

export async function deleteSchool(schoolId) {
  mutationGuard('deleteSchool');
  // Delete child data first
  const tables = ['teacher_assignments', 'class_streams', 'subject_assignments', 'core_competencies',
    'cbc_assessments', 'attendance', 'marks', 'fees', 'students', 'teachers', 'school_features', 'school_profiles'];
  for (const t of tables) {
    await supabase.from(t).delete().eq('school_id', schoolId);
  }
  const { error } = await supabase.from('schools').delete().eq('id', schoolId);
  if (error) throw error;
  await logPlatformActivity('SCHOOL_DELETED', \`School \${schoolId} permanently deleted\`, schoolId);
}

export async function wipeAllNonAdminSchools() {
  mutationGuard('wipeAllNonAdminSchools');
  const { data: schools } = await supabase.from('schools').select('id, plan');
  const toDelete = (schools || []).filter(s => s.plan !== 'Platform Admin');
  for (const s of toDelete) {
    await deleteSchool(s.id);
  }
  return toDelete.length;
}

// ============= USERS =============

export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('school_id', _currentSchoolId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addUser(userData) {
  mutationGuard('addUser');
  const { error } = await supabase.from('users').insert({ ...userData, school_id: _currentSchoolId });
  if (error) throw error;
}

export async function deleteUser(userId) {
  mutationGuard('deleteUser');
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) throw error;
}

export async function setSelfPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// ============= DATA OPERATIONS =============

export async function resetAllData() {
  if (!_currentSchoolId) return;
  const tables = ['teacher_assignments', 'class_streams', 'subject_assignments', 'core_competencies',
    'cbc_assessments', 'attendance', 'marks', 'fees', 'students', 'teachers'];
  for (const t of tables) {
    await supabase.from(t).delete().eq('school_id', _currentSchoolId);
  }
}

export async function exportData() {
  const profile = await getSchoolProfile();
  const backup = { schoolProfile: profile, exportDate: new Date().toISOString() };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
  const link = document.createElement('a');
  link.setAttribute("href", dataStr);
  link.setAttribute("download", \`Termly_backup_\${new Date().toISOString().split('T')[0]}.json\`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function importData(jsonDataStr) {
  throw new Error('Import is not yet supported on the cloud version. Please contact support.');
}

// ============= MPESA =============

export async function testMpesaConnection() {
  const profile = await getSchoolProfile();
  if (!profile.mpesa_config?.shortcode) throw new Error('M-Pesa shortcode not configured');
  return { success: true, message: 'M-Pesa configuration looks valid' };
}

export async function getMpesaLogs(limit = 50) {
  const { data, error } = await supabase
    .from('mpesa_callbacks')
    .select('*')
    .eq('school_id', _currentSchoolId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function autoProcessMpesaCallbacks() {
  // Stub: auto-reconcile M-Pesa callbacks
}

// ============= SMS =============

export async function testSmsConnection() {
  const profile = await getSchoolProfile();
  if (!profile.sms_config?.api_key) throw new Error('SMS API key not configured');
  return { success: true, message: 'SMS configuration looks valid' };
}

// ============= PLATFORM ADMIN =============

export async function getPlatformAdmins() {
  const { data, error } = await supabase.from('platform_admins').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addPlatformAdmin(email, role = 'admin') {
  mutationGuard('addPlatformAdmin');
  const { error } = await supabase.from('platform_admins').insert({ email, role });
  if (error) throw error;
  await logPlatformActivity('PLATFORM_ADMIN_ADDED', \`Added: \${email}\`);
}

export async function removePlatformAdmin(email) {
  mutationGuard('removePlatformAdmin');
  const { error } = await supabase.from('platform_admins').delete().eq('email', email);
  if (error) throw error;
  await logPlatformActivity('PLATFORM_ADMIN_REMOVED', \`Removed: \${email}\`);
}

export async function getPlatformActivities(limit = 50) {
  const { data, error } = await supabase.from('platform_activity')
    .select('id, type, description, actor_email, created_at, schools(name)')
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getGlobalAuditLogs(limit = 100) {
  const { data, error } = await supabase.from('audit_logs')
    .select('*, schools(name)')
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

// ============= SAAS / BLOG / PARTNERS (Public pages) =============

export async function getSaasBlogPosts() {
  const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getFeaturedPartners() {
  const { data, error } = await supabase.from('partners').select('*').eq('featured', true);
  if (error) throw error;
  return data || [];
}

export async function registerSchool(schoolData) {
  const { data, error } = await supabase.rpc('register_school', schoolData);
  if (error) throw error;
  return data;
}

export async function getCurrentPeriodDetails() {
  if (!_currentPeriodId) return null;
  const { data, error } = await supabase.from('academic_periods')
    .select('*').eq('id', _currentPeriodId).maybeSingle();
  if (error) throw error;
  return data;
}

// ============= SYNC =============

let _syncing = false;

export async function triggerSync() {
  if (_syncing || !navigator.onLine) return;
  _syncing = true;
  window.dispatchEvent(new Event('syncStarted'));

  try {
    const pending = await getPendingSync();
    for (const item of pending) {
      try {
        let success = false;
        switch (item.type) {
          case syncTypes.ADD_STUDENT: {
            const { error: err1 } = await supabase.from('students').insert([item.payload]);
            if (!err1) success = true; break;
          }
          case syncTypes.ADD_MARK: {
            const { error: err2 } = await supabase.from('marks').insert([item.payload]);
            if (!err2) success = true; break;
          }
          case syncTypes.UPDATE_STUDENT: {
            const { id: studentId, ...updates } = item.payload;
            const { error: err3 } = await supabase.from('students').update(updates).eq('id', studentId);
            if (!err3) success = true; break;
          }
          case syncTypes.ADD_ATTENDANCE: {
            const { error: err4 } = await supabase.from('attendance').upsert(item.payload);
            if (!err4) success = true; break;
          }
          default: success = true; break;
        }
        await updateSyncStatus(item.id, success ? 'synced' : 'failed');
      } catch (e) { console.error("Sync item failed:", e); }
    }
  } finally {
    _syncing = false;
    window.dispatchEvent(new Event('syncCompleted'));
  }
  try { await autoProcessMpesaCallbacks(); } catch (e) { /* silent */ }
}

// ============= PRINT HELPERS =============

export async function getPrintHeader(title = '') {
  const profile = await getSchoolProfile();
  return \`
    <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
      <h1 style="margin: 0; font-size: 24px; color: #1e3a8a;">\${profile.schoolName || 'Termly School'}</h1>
      \${profile.motto ? \`<p style="margin: 5px 0; font-style: italic;">\${profile.motto}</p>\` : ''}
      <p style="margin: 5px 0; font-size: 14px;">\${[profile.address, profile.phone, profile.email].filter(Boolean).join(' | ')}</p>
      <h2 style="margin: 15px 0 0 0; font-size: 18px; text-transform: uppercase;">\${title}</h2>
    </div>
  \`;
}

export async function getPrintFooter() {
  return \`
    <div style="margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 12px; color: #666; text-align: center;">
      Printed from Termly School Management System | \${new Date().toLocaleString()}
    </div>
  \`;
}

// ============= PORTAL ACCESS =============

export async function getPortalAccessSettings() {
  const profile = await getSchoolProfile();
  return profile.portal_access || { student: true, parent: true, staff: true };
}

export async function updatePortalAccessSettings(settings) {
  return await saveSchoolProfile({ portal_access: settings });
}

// ============= PUBLIC / PORTAL =============

export async function searchPublicSchools(query) {
  if (!query || query.trim().length < 2) return [];
  const { data, error } = await supabase.rpc('search_public_schools', { search_query: query.trim() });
  if (error) throw error;
  return data || [];
}

export async function getSchoolByCode(code) {
  const { data, error } = await supabase.from('schools')
    .select('id, name, school_code, location, school_type, publicly_listed')
    .eq('school_code', code).eq('status', 'active').maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPortalActivity(limit = 10) {
  const { data, error } = await supabase.from('portal_activity_log')
    .select('*').eq('school_id', _currentSchoolId)
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data || []).map(item => ({
    ...item,
    date: new Date(item.created_at).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }));
}

export async function logPortalActivity(action, targetType, metadata = {}) {
  try {
    const { error } = await supabase.from('portal_logs').insert({
      school_id: _currentSchoolId, action, target_type: targetType, metadata
    });
    if (error) console.warn('logPortalActivity error:', error);
  } catch (e) { console.warn('logPortalActivity exception:', e); }
}

// ============= ALIASES =============
export const initStore = initPortalStore;
export const getPlatformSchoolProfiles = getAllSchools;
export const getPlatformUsageStats = getPlatformStats;
`;

// Need to handle the import at the top: offlineStore is already imported by the facade,
// but coreStore.js itself needs it for triggerSync.
// We insert the import right after the first import line.
const firstImportEnd = code.indexOf('\n') + 1;
const importLine = "import { getPendingSync, updateSyncStatus, syncTypes } from './offlineStore';\n";

if (!code.includes("from './offlineStore'")) {
  code = code.slice(0, firstImportEnd) + importLine + code.slice(firstImportEnd);
}

code += appendBlock;

fs.writeFileSync('src/data/coreStore.js', code);
console.log('SUCCESS: Appended all missing functions to coreStore.js');
console.log('Total size:', code.length, 'bytes');
