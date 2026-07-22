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
