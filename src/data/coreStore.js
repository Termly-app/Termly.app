import { supabase } from '../lib/supabase';

export { supabase };

export let _currentSchoolId = sessionStorage.getItem('Termly_portal_school_id') || null;
export let _currentAuthUser = null;
export let _currentPeriodId = sessionStorage.getItem('Termly_portal_period_id') || null;
export let _currentUserId   = sessionStorage.getItem('Termly_portal_user_id') || null;
export let _currentExamType = '';



export function initPortalStore(schoolId, userId = null, periodId = null) {
  console.log(`[PORTAL STORE] Initializing for School: ${schoolId}, User: ${userId}`);
  _currentSchoolId = schoolId;
  _currentUserId = userId;
  _currentPeriodId = periodId;
  _currentAuthUser = null; 
  
  if (schoolId) sessionStorage.setItem('Termly_portal_school_id', schoolId);
  if (userId) sessionStorage.setItem('Termly_portal_user_id', userId);
  if (periodId) sessionStorage.setItem('Termly_portal_period_id', periodId);
  
  window.dispatchEvent(new Event('schoolProfileChanged'));
}

export const isShadowMode = () => {
  return sessionStorage.getItem('Termly_acting_as_admin') === 'true';
};

export async function logAuditEvent(action, targetType, targetId, details) {
  if (!_currentSchoolId) return;
  try {
    const { error } = await supabase.from('audit_logs').insert({
      school_id: _currentSchoolId,
      user_id: _currentUserId,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      created_at: new Date().toISOString()
    });
    if (error) console.error("Audit Log failed:", error);
  } catch (e) {
    console.error("Audit log error:", e);
  }
}

export async function logPlatformActivity(type, description, schoolId = null) {
  try {
    const { error } = await supabase.from('platform_activity').insert({
      type,
      description,
      school_id: schoolId,
      actor_email: _currentUserId,
      created_at: new Date().toISOString()
    });
    if (error) console.error("Platform Activity Log failed:", error);
  } catch (e) {
    console.error("Platform activity error:", e);
  }
}

export const mutationGuard = (fnName) => {
  if (isShadowMode()) {
    console.warn(`[SHADOW MODE] Blocked mutation attempt in ${fnName}`);
    throw new Error('Action blocked: You are currently in View-Only Shadow Mode (Watching TV).');
  }
};

const _lastFetch = {};
export function shouldFetchCloud(key, ttl = 10000) {
  const now = Date.now();
  if (!_lastFetch[key] || now - _lastFetch[key] > ttl) {
    _lastFetch[key] = now;
    return true;
  }
  return false;
}

const _dbCache = {};
export async function cachedQuery(key, fetcher, ttl = 10000) {
  const now = Date.now();
  if (_dbCache[key] && (now - _dbCache[key].time) < ttl) {
    return _dbCache[key].promise;
  }
  const promise = fetcher();
  _dbCache[key] = { time: now, promise };
  try {
    await promise;
  } catch (e) {
    delete _dbCache[key];
    throw e;
  }
  return promise;
}

export function invalidateCache(key) {
  if (key) delete _dbCache[key];
  else {
    Object.keys(_dbCache).forEach(k => delete _dbCache[k]);
  }
}

// ============= FEATURE TOGGLES (Replaces Plans) =============
const _featureCache = new Map(); // Cache map: { `${schoolId}_${featureKey}`: { value: boolean, timestamp: number } }
const CACHE_TTL = 30 * 1000; // 30 seconds

export async function hasFeature(schoolId, featureKey) {
  if (!schoolId || !featureKey) return false;
  
  const cacheKey = `${schoolId}_${featureKey}`;
  const cached = _featureCache.get(cacheKey);
  const now = Date.now();

  // Return cached if within TTL
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.value;
  }

  try {
    let finalStatus = false;

    // PORTAL/UNAUTH MODE: Use RPC to bypass RLS
    if (!_currentAuthUser) {
      const { data: rpcData, error: rpcError } = await supabase.rpc('portal_has_feature', { 
        p_school_id: schoolId, 
        p_feature_key: featureKey 
      });
      if (!rpcError && rpcData !== null) {
        finalStatus = rpcData;
      } else {
        // Fallback to direct query if RPC fails or is missing
        const { data, error } = await supabase
          .from('school_features')
          .select('is_enabled, expires_at')
          .eq('school_id', schoolId)
          .eq('feature_key', featureKey)
          .maybeSingle();
        
        const isEnabled = data?.is_enabled || false;
        const isExpired = data?.expires_at && new Date(data.expires_at) < now;
        finalStatus = isEnabled && !isExpired;
      }
    } else {
      // ADMIN MODE: Direct table query (has auth session)
      const { data, error } = await supabase
        .from('school_features')
        .select('is_enabled, expires_at')
        .eq('school_id', schoolId)
        .eq('feature_key', featureKey)
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') {
        console.error(`Error checking feature ${featureKey}:`, error);
        return false; 
      }
      
      const isEnabled = data?.is_enabled || false;
      const isExpired = data?.expires_at && new Date(data.expires_at) < now;
      finalStatus = isEnabled && !isExpired;
    }

    _featureCache.set(cacheKey, { value: finalStatus, timestamp: now });
    return finalStatus;
  } catch (err) {
    console.error(`Exception checking feature ${featureKey}:`, err);
    return false;
  }
}

export function invalidateFeatureCache(schoolId) {
  if (!schoolId) {
    _featureCache.clear();
    return;
  }
  for (const key of _featureCache.keys()) {
    if (key.startsWith(`${schoolId}_`)) {
      _featureCache.delete(key);
    }
  }
}

export async function getAllFeaturesRegistry() {
  const { data, error } = await supabase
    .from('features_registry')
    .select('*')
    .order('feature_name');
  if (error) throw error;
  return data || [];
}

export async function updateSchoolFeature(schoolId, featureKey, isEnabled, expiresAt = null) {
  mutationGuard('updateSchoolFeature');
  const { error } = await supabase
    .from('school_features')
    .upsert({
      school_id: schoolId,
      feature_key: featureKey,
      is_enabled: isEnabled,
      expires_at: expiresAt,
      updated_at: new Date().toISOString()
    }, { onConflict: 'school_id, feature_key' });
  
  if (error) throw error;
  _featureCache.delete(`${schoolId}_${featureKey}`);
}

export async function getSchoolFeatures(schoolId) {
  const { data, error } = await supabase
    .from('school_features')
    .select('*')
    .eq('school_id', schoolId);
  if (error) throw error;
  return data || [];
}

export function setCurrentSchoolContext(schoolId, authUser) {
  _currentSchoolId = schoolId;
  _currentAuthUser = authUser;
  window.dispatchEvent(new Event('schoolProfileChanged'));
}

export function setCurrentPeriodId(periodId) {
  _currentPeriodId = periodId;
  window.dispatchEvent(new Event('periodChanged'));
}

export function getCurrentPeriodId() {
  return _currentPeriodId;
}

export function setCurrentExamType(type) {
  _currentExamType = type;
  window.dispatchEvent(new Event('examTypeChanged'));
}

export function getCurrentExamType() {
  return _currentExamType;
}

export function getCurrentSchoolId() {
  return _currentSchoolId;
}

export function getCurrentAuthUser() {
  return _currentAuthUser;
}

export function setCurrentSchool(schoolId) {
  _currentSchoolId = schoolId;
  window.dispatchEvent(new Event('schoolChanged'));
}

export function getCurrentSchool() {
  return _currentSchoolId;
}


// ============================================================================
// EVERYTHING BELOW WAS RESTORED BY fix_coreStore_final.cjs
// These functions were in the original monolithic store.js and must be exported
// from coreStore.js for the domain stores and pages to work.
// ============================================================================



// ============= REALTIME SUBSCRIPTIONS =============

export function subscribeToSchoolChanges(onSettingsChange, onProfileChange) {
  if (!_currentSchoolId) return () => {};

  const channel = supabase
    .channel(`school_shell_${_currentSchoolId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, () => {
      onSettingsChange();
    })
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'school_profiles',
      filter: `school_id=eq.${_currentSchoolId}`
    }, () => {
      onProfileChange();
    })
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'school_features',
      filter: `school_id=eq.${_currentSchoolId}`
    }, (payload) => {
      console.log("[REALTIME] Feature changed:", payload.new);
      invalidateFeatureCache(_currentSchoolId);
      onSettingsChange();
    })
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'students',
      filter: `school_id=eq.${_currentSchoolId}`
    }, () => {
      window.dispatchEvent(new Event('studentsSynced'));
    })
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'mpesa_callbacks',
      filter: `school_id=eq.${_currentSchoolId}`
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
    .channel(`data_changes_${_currentSchoolId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'students',
      filter: `school_id=eq.${_currentSchoolId}`
    }, () => onStudentChange?.())
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'fees',
      filter: `school_id=eq.${_currentSchoolId}`
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

  const activeClasses = data.active_classes || data.activeClasses || [];
  const streamsPerClass = data.streams_per_class || data.streamsPerClass || {};
  const customSubjects = data.custom_subjects || data.customSubjects || {};
  const gradeFees = data.grade_fees || data.gradeFees || {};
  const gradingSystems = data.grading_systems || data.gradingSystems || null;

  return {
    id: data.id,
    schoolId: data.school_id,
    school_id: data.school_id,
    schoolName: data.school_name || data.schoolName || '',
    school_name: data.school_name || data.schoolName || '',
    subscriptionPlan: data.subscription_plan || 'Free',
    subscriptionStatus: data.subscription_status || 'Active',
    subscriptionExpiry: data.subscription_expiry,
    logoUrl: data.logo_url || data.logo || '',
    logo: data.logo || data.logo_url || '',
    motto: data.motto || '',
    phone: data.phone || '',
    address: data.address || '',
    email: data.email || '',
    schoolType: data.school_type || data.schoolType || 'Day',
    school_type: data.school_type || data.schoolType || 'Day',
    curriculum: data.curriculum || 'CBC Only',
    enabledModules: data.enabled_modules || {},
    enabled_modules: data.enabled_modules || {},
    grading_systems: gradingSystems,
    gradingSystems: gradingSystems,
    grade_fees: gradeFees,
    gradeFees: gradeFees,
    active_classes: activeClasses,
    activeClasses: activeClasses,
    streams_per_class: streamsPerClass,
    streamsPerClass: streamsPerClass,
    custom_subjects: customSubjects,
    customSubjects: customSubjects,
    studentLimit: data.student_limit || customSubjects?.__limits?.students || 10000,
    student_limit: data.student_limit || customSubjects?.__limits?.students || 10000,
    staffLimit: data.staff_limit || customSubjects?.__limits?.staff || 1000,
    staff_limit: data.staff_limit || customSubjects?.__limits?.staff || 1000,
    portal_access: data.portal_access,
    mpesa_config: data.mpesa_config,
    sms_config: data.sms_config,
    setup_completed: data.setup_completed
  };
}

export function checkIsSubscriptionActive(profile) {
  if (!profile) return false;
  
  // Sandbox and Platform Admin (Super Admin) NEVER expire
  if (profile.subscriptionPlan === 'Sandbox' || profile.subscriptionPlan === 'Platform Admin') return true;

  if (profile.subscriptionStatus === 'Deactivated' || profile.subscriptionStatus === 'Suspended') {
    return false;
  }

  // Enforce explicit subscription expiry date for Demo & Production accounts
  if (profile.subscriptionExpiry) {
    const expDate = new Date(profile.subscriptionExpiry);
    expDate.setHours(23, 59, 59, 999);
    if (expDate < new Date()) {
      return false;
    }
  }

  if (profile.subscriptionStatus === 'Expired') return false;

  return true;
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
      .select('email')
      .eq('email', user.email)
      .maybeSingle();
    return !!data;
  } catch { return false; }
}

// ============= SCHOOL PROFILE CRUD =============

let _profileCache = null;

export async function getSchoolProfile() {
  if (!_currentSchoolId) return null;
  if (_profileCache) return _profileCache;
  const profile = await getSchoolProfileBySchoolId(_currentSchoolId);
  _profileCache = profile;
  return profile;
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

  // Map camelCase UI properties to snake_case DB columns
  if (profile.activeClasses !== undefined) row.active_classes = profile.activeClasses;
  if (profile.streamsPerClass !== undefined) row.streams_per_class = profile.streamsPerClass;
  if (profile.customSubjects !== undefined) row.custom_subjects = profile.customSubjects;
  if (profile.gradeFees !== undefined) row.grade_fees = profile.gradeFees;
  if (profile.gradingSystems !== undefined) row.grading_systems = profile.gradingSystems;
  if (profile.schoolName !== undefined) row.school_name = profile.schoolName;
  if (profile.schoolType !== undefined) row.school_type = profile.schoolType;
  if (profile.logoUrl !== undefined) row.logo_url = profile.logoUrl;
  if (profile.logo !== undefined) row.logo = profile.logo;

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
      if (Array.isArray(row.grading_systems[lv])) {
        row.grading_systems[lv] = row.grading_systems[lv].map(g => ({
          ...g,
          min: Math.max(0, Math.min(100, Number(g.min) || 0)),
          max: Math.max(0, Math.min(100, Number(g.max) || 0))
        }));
      }
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

export async function updateSchoolPlan(schoolId, planName) {
  const { error } = await supabase
    .from('schools')
    .update({ plan: planName })
    .eq('id', schoolId);
  if (error) throw error;
  await logPlatformActivity('PLAN_CHANGE', `School ${schoolId} plan updated to ${planName}`, schoolId);
}

export async function updateSchoolLimits(schoolId, { students, staff }) {
  const numStudents = Number(students) || 10000;
  const numStaff = Number(staff) || 1000;

  const { data: profile } = await supabase
    .from('school_profiles')
    .select('id, custom_subjects')
    .eq('school_id', schoolId)
    .maybeSingle();

  const custom_subjects = profile?.custom_subjects || {};
  custom_subjects.__limits = {
    students: numStudents,
    staff: numStaff,
  };

  const { error } = await supabase
    .from('school_profiles')
    .update({ 
      custom_subjects,
      staff_limit: numStaff,
      student_limit: numStudents
    })
    .eq('school_id', schoolId);

  if (error) {
    const { error: e2 } = await supabase
      .from('school_profiles')
      .update({ custom_subjects })
      .eq('school_id', schoolId);
    if (e2) throw e2;
  }

  try {
    invalidateCache(`profile_${schoolId}`);
    invalidateCache(`school_profile_${schoolId}`);
    window.dispatchEvent(new Event('schoolProfileChanged'));
  } catch (e) {}

  await logPlatformActivity('LIMITS_UPDATE', `School ${schoolId} limits updated to ${numStudents} students, ${numStaff} staff seats.`, schoolId);
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
  await logPlatformActivity('DEACTIVATION', `School ${schoolId} deactivated. Reason: ${reason || 'Not specified'}`, schoolId);
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
  await logPlatformActivity('RESTORATION', `School ${schoolId} restored for ${monthsToAdd} months`, schoolId);
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
  await logPlatformActivity('SCHOOL_DELETED', `School ${schoolId} permanently deleted`, schoolId);
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

export async function adminUpdateSchoolProfile(schoolId, updates) {
  mutationGuard('adminUpdateSchoolProfile');
  const { error } = await supabase
    .from('school_profiles')
    .update(updates)
    .eq('school_id', schoolId);
  if (error) throw error;
  await logPlatformActivity('ADMIN_UPDATE_PROFILE', `Updated profile for school ${schoolId}`, schoolId);
}

// ============= USERS =============





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
  link.setAttribute("download", `Termly_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function importData(jsonDataStr) {
  throw new Error('Import is not yet supported on the cloud version. Please contact support.');
}



// ============= PLATFORM ADMIN =============

export async function getPlatformAdmins() {
  const { data, error } = await supabase.from('platform_admins').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addPlatformAdmin(email, role = 'admin') {
  mutationGuard('addPlatformAdmin');
  const { error } = await supabase.from('platform_admins').insert({ email, added_by: 'system' });
  if (error) throw error;
  await logPlatformActivity('PLATFORM_ADMIN_ADDED', `Added: ${email}`);
}

export async function removePlatformAdmin(email) {
  mutationGuard('removePlatformAdmin');
  const { error } = await supabase.from('platform_admins').delete().eq('email', email);
  if (error) throw error;
  await logPlatformActivity('PLATFORM_ADMIN_REMOVED', `Removed: ${email}`);
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



// ============= SYNC EXPORTED TO syncStore.js =============

// ============= MIGRATIONS & INVITATIONS =============

export async function sendSchoolInvite(email) {
  const { data, error } = await supabase.rpc('send_school_invite', { p_email: email });
  if (error) throw error;
  return data;
}

export async function getSchemaStatus() {
  const { data, error } = await supabase.rpc('get_schema_status');
  if (error) throw error;
  return data;
}

export async function runSchemaMigration(sql) {
  const { data, error } = await supabase.rpc('run_schema_migration', { p_sql: sql });
  if (error) throw error;
  return data;
}

// ============= PRINT HELPERS =============

export async function getPrintHeader(title = '') {
  const profile = await getSchoolProfile();
  return '<div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">' +
         '<h1 style="margin: 0; font-size: 24px; color: #1e3a8a;">' + (profile.schoolName || 'Termly School') + '</h1>' +
         (profile.motto ? '<p style="margin: 5px 0; font-style: italic;">' + profile.motto + '</p>' : '') +
         '<p style="margin: 5px 0; font-size: 14px;">' + [profile.address, profile.phone, profile.email].filter(Boolean).join(' | ') + '</p>' +
         '<h2 style="margin: 15px 0 0 0; font-size: 18px; text-transform: uppercase;">' + title + '</h2>' +
         '</div>';
}

export async function getPrintFooter() {
  return '<div style="margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 12px; color: #666; text-align: center;">' +
         'Printed from Termly School Management System | ' + new Date().toLocaleString() +
         '</div>';
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
export const getSchoolsForPortalSearch = searchPublicSchools;
