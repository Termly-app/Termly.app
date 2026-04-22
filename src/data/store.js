import { supabase } from '../lib/supabase';
import { db, queueChange, getPendingSync, updateSyncStatus, syncTypes } from './offlineStore';
import { SANDBOX_PLAN } from './constants';
export { supabase };
 
function maskSecret(val) {
  if (!val || val.length < 4) return val;
  return `${val.substring(0, 4)}...********`;
}

import { CBC_STRUCTURE, CBC_CORE_COMPETENCIES, TERM_FEE, getLevelForGrade, getSubjectsForGrade } from './seedData';
export { CBC_STRUCTURE, CBC_CORE_COMPETENCIES, TERM_FEE, getLevelForGrade, getSubjectsForGrade };

import { encryptData as encrypt, decryptData as decrypt } from '../utils/securityUtils';


// ============= SaaS Subscription Tiers =============
// Consolidated into SEAT_LIMITS below


// ============= CURRENT SCHOOL CONTEXT =============
// Stored in-memory during session (set after login)
// Triggering fresh build on Vercel...
var _currentSchoolId = sessionStorage.getItem('shulesoft_portal_school_id') || null;
var _currentAuthUser = null;
var _currentPeriodId = sessionStorage.getItem('shulesoft_portal_period_id') || null;
var _currentUserId   = sessionStorage.getItem('shulesoft_portal_user_id') || null;

/**
 * Initializes the store context for Portal users.
 */
export function initPortalStore(schoolId, userId = null, periodId = null) {
  console.log(`[PORTAL STORE] Initializing for School: ${schoolId}, User: ${userId}`);
  _currentSchoolId = schoolId;
  _currentUserId = userId;
  _currentPeriodId = periodId;
  _currentAuthUser = null; 
  
  if (schoolId) sessionStorage.setItem('shulesoft_portal_school_id', schoolId);
  if (userId) sessionStorage.setItem('shulesoft_portal_user_id', userId);
  if (periodId) sessionStorage.setItem('shulesoft_portal_period_id', periodId);
}

// MEMORY CACHE (Performance Optimization)
var _profileCache    = null;
var _profilePromise  = null;
var _settingsCache   = null;
var _settingsPromise = null;

// SHADOW MODE (VIEW-ONLY) GUARD
export const isShadowMode = () => {
  return sessionStorage.getItem('shulesoft_acting_as_admin') === 'true';
};

const mutationGuard = (fnName) => {
  if (isShadowMode()) {
    console.warn(`[SHADOW MODE] Blocked mutation attempt in ${fnName}`);
    throw new Error('Action blocked: You are currently in View-Only Shadow Mode (Watching TV).');
  }
};

// NETWORK DEBOUNCE CACHE (Performance Optimization)
// Prevents cloud-fetches from spamming on navigation when offline cache is fresh
const _lastFetch = {};

function shouldFetchCloud(key, ttl = 10000) { // 10s default TTL
  const now = Date.now();
  if (!_lastFetch[key] || now - _lastFetch[key] > ttl) {
    _lastFetch[key] = now;
    return true;
  }
  return false;
}

// Memory caching for direct Supabase reads to prevent spamming
const _dbCache = {};
async function cachedQuery(key, fetcher, ttl = 10000) {
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

function invalidateCache(key) {
  if (key) delete _dbCache[key];
  else {
    // Clear all if no key
    Object.keys(_dbCache).forEach(k => delete _dbCache[k]);
  }
}

// Consolidated into Super Admin Pricing Table

/**
 * Get limits for a plan, favoring DB settings if available
 */
export async function getPlanLimits(planNameRaw) {
  const planName = (planNameRaw || 'Sandbox').toLowerCase();
  try {
    const settings = await getPlatformSettings();
    if (settings?.pricing) {
      // Case-insensitive lookup in Super Admin Pricing table
      const pricingKeys = Object.keys(settings.pricing);
      const matchedKey = pricingKeys.find(k => k.toLowerCase() === planName);
      const p = matchedKey ? settings.pricing[matchedKey] : settings.pricing['Sandbox'] || settings.pricing['Starter Plan'];
      
      if (p) {
        return {
          students: p.limit || p.students || 0,
          admins: p.admins || 0,
          price: p.price || 0
        };
      }
    }
  } catch (e) { console.error("Error fetching plan limits:", e); }
  
  // Final safeguard-defaults if pricing table is empty (Sandbox rules)
  return { students: 150, admins: 5, price: 0 };
}

export function setCurrentSchoolContext(schoolId, authUser) {
  _currentSchoolId = schoolId;
  _currentAuthUser = authUser;
  _profileCache    = null; // Invalidate cache on school switch
  _profilePromise  = null;
}

export function setCurrentPeriodId(periodId) {
  _currentPeriodId = periodId;
  window.dispatchEvent(new Event('periodChanged'));
}

export function getCurrentPeriodId() {
  return _currentPeriodId;
}

var _currentExamType = 'End Term';
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

// Redundant period functions removed (consolidated below)


// ============= SCHOOLS =============
export async function getRegisteredSchools() {
  const { data, error } = await supabase.from('schools').select('id, name, email, plan, owner_id, phone, location, created_at, school_code');
  if (error) throw error;
  return data || [];
}

/**
 * Rapid fuzzy search for schools by name, code or email
 */
export async function searchSchools(query) {
  if (!query || query.length < 2) return [];
  const { data, error } = await supabase
    .from('schools')
    .select('id, name, school_code, email')
    .or(`name.ilike.%${query}%,school_code.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(8);
  if (error) throw error;
  return data || [];
}

export async function registerSchool(name, email, plan, authUserId, adminName, adminEmail, phone = '', location = '', curriculum = 'CBC Only') {
  // 1. Create the school row
  const baseCode = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const school_code = `${baseCode}-${Math.floor(Math.random() * 10000)}`;

  const { data: school, error: schoolErr } = await supabase
    .from('schools')
    .insert({ name, email, plan, owner_id: authUserId, phone, location, school_code })
    .select('id, name, email, plan, owner_id, phone, location, created_at, school_code')
    .single();
  if (schoolErr) throw schoolErr;

// 2. Create the school profile (default)
  const { error: profileErr } = await supabase
    .from('school_profiles')
    .insert({ 
      school_id: school.id, 
      school_name: name,
      subscription_plan: plan,
      subscription_status: plan === 'Sandbox' ? 'Active' : 'Inactive', 
      subscription_expiry: plan === 'Sandbox' ? '2099-12-31T23:59:59Z' : new Date().toISOString(),
      phone,
      address: location,
      curriculum: curriculum
    });
  if (profileErr) throw profileErr;

  // 3. Create the initial user record (Owner)
  const { error: userErr } = await supabase
    .from('users')
    .insert({
      school_id: school.id,
      auth_user_id: authUserId,
      name: adminName,
      email: adminEmail,
      role: 'Admin'
    });
  if (userErr) throw userErr;

  // 4. Create the first academic period (Based on current Kenyan school calendar)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  let term = 'Term 1';
  if (currentMonth >= 5 && currentMonth <= 8) term = 'Term 2';
  else if (currentMonth >= 9) term = 'Term 3';

  const { error: periodErr } = await supabase
    .from('academic_periods')
    .insert({
      school_id: school.id,
      year: currentYear,
      term: term,
      is_active: true
    });
  if (periodErr) throw periodErr;
  
  await logPlatformActivity('REGISTRATION', `New school registered: ${name}`, school.id);
  return school;
}

/**
 * Find a school workspace by user provided email
 */
export async function findSchool(schoolEmail) {
  const { data, error } = await supabase
    .from('schools')
    .select('id, name, email, plan, owner_id, phone, location, created_at, school_profiles(subscription_status, subscription_plan, subscription_expiry)')
    .eq('email', schoolEmail)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Repair a school that is missing its profile
 */
export async function repairSchoolProfile(schoolId) {
  // 1. Get school info
  const { data: school, error: sErr } = await supabase
    .from('schools')
    .select('id, name, email, plan, owner_id, phone, location, created_at')
    .eq('id', schoolId)
    .single();
  if (sErr) throw sErr;

    const { data: platformSettings } = await supabase.from('platform_settings').select('config').eq('key', 'pricing').single();
    const pricing = platformSettings?.config || {};
    const firstActivePlan = Object.keys(pricing).find(k => pricing[k].active !== false) || 'Basic';

    // 2. Create the missing profile
    const { error: pErr } = await supabase
      .from('school_profiles')
      .insert({
        school_id: school.id,
        school_name: school.name,
        subscription_plan: school.plan || firstActivePlan,
        subscription_status: 'Inactive',
        subscription_expiry: new Date().toISOString()
      });
  if (pErr) throw pErr;

  // 3. Ensure academic period exists
  const now = new Date();
  const { data: period } = await supabase
    .from('academic_periods')
    .select('id')
    .eq('school_id', school.id)
    .limit(1);
  
  if (!period || period.length === 0) {
    await supabase.from('academic_periods').insert({
      school_id: school.id,
      year: now.getFullYear(),
      term: now.getMonth() < 4 ? 'Term 1' : now.getMonth() < 8 ? 'Term 2' : 'Term 3',
      is_active: true
    });
  }

  await logPlatformActivity('REPAIR', `Repaired/Initialized school metadata: ${school.name}`, school.id);
  return { success: true };
}

/**
 * Get metrics for data integrity and legacy discovery
 */
export async function getDiscoveryMetrics() {
  const meta = { orphans: [], legacy: [] };

  try {
    // 1. Check for orphaned schools (no profiles)
    const { data: allSchools, error: sErr } = await supabase.from('schools').select('id, name, created_at');
    const { data: allProfiles, error: pErr } = await supabase.from('school_profiles').select('school_id');
    
    if (sErr) console.warn('Discovery: Schools fetch restricted or error:', sErr);
    if (pErr) console.warn('Discovery: Profiles fetch restricted or error:', pErr);

    if (allSchools && allProfiles) {
      const profIds = new Set(allProfiles.map(p => p.school_id));
      meta.orphans = allSchools.filter(s => !profIds.has(s.id));
      console.log(`Discovery Audit: Found ${meta.orphans.length} orphans out of ${allSchools.length} schools.`);
    } else if (allSchools) {
      // If profiles fetch failed but schools worked, assume all without profiles are orphans (conservative)
      meta.orphans = allSchools;
    }

    // 2. Check legacy tables
    const tables = ['settings', 'profiles', 'admin_users', 'organizations'];
    for (const t of tables) {
      try {
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
        if (!error && count !== null) {
          meta.legacy.push({ table: t, count: count || 0 });
        }
      } catch (e) { /* Table likely doesn't exist, ignore */ }
    }
  } catch (err) {
    console.error('getDiscoveryMetrics overall failure:', err);
  }

  return meta;
}


// ============= SCHOOL PROFILE =============
const defaultStreams = [];
const defaultStreamsPerClass = {};

const DEFAULT_PROFILE = {
  schoolName: 'My Institution',
  motto: '', phone: '', email: '', address: '', logo: '',
  subscriptionPlan: 'Sandbox',
  streamsPerClass: defaultStreamsPerClass,
  customSubjects: {},
  boardingHouses: [],
  activeClasses: [],
  gradeFees: {},
  subscriptionStatus: 'Trial',
  subscriptionExpiry: null,
  lastPaymentStatus: 'none',
  mpesa_config: { shortcode: '', consumer_key: '', consumer_secret: '' },
  sms_config: { sender_id: '', api_key: '' },
  curriculum: 'CBC Only',
  timetable_label: 'Weekly',
  custom_exams: [],
  gradingSystems: { 
    default: [
      {min: 80, max: 100, grade: 'A', color: '#10b981'},
      {min: 70, max: 79, grade: 'B', color: '#3b82f6'},
      {min: 60, max: 69, grade: 'C', color: '#f59e0b'},
      {min: 50, max: 59, grade: 'D', color: '#f97316'},
      {min: 0, max: 49, grade: 'E', color: '#ef4444'}
    ]
  },
  enabledModules: { attendance: true }
};

// Offline profile persistence helpers
const PROFILE_CACHE_KEY = 'shulesoft_profile_cache';
function saveProfileToLocal(schoolId, profile) {
  try {
    const blob = JSON.stringify({ schoolId, profile, ts: Date.now() });
    localStorage.setItem(PROFILE_CACHE_KEY, blob);
  } catch (e) { /* localStorage full or blocked */ }
}
function loadProfileFromLocal(schoolId) {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.schoolId !== schoolId) return null;
    return parsed.profile;
  } catch (e) { return null; }
}

const SAFE_PROFILE_COLUMNS = 'id, school_name, motto, phone, email, address, logo, subscription_plan, streams_per_class, custom_subjects, active_classes, grade_fees, subscription_status, subscription_expiry, last_payment_status, mpesa_config, sms_config, grading_systems, curriculum, timetable_label';

/**
 * Maps raw database profile (snake_case) to application profile (camelCase)
 */
function mapSchoolProfile(data) {
  if (!data) return { ...DEFAULT_PROFILE };
  
  return {
    schoolName: data.school_name || DEFAULT_PROFILE.schoolName,
    motto: data.motto || '',
    phone: data.phone || '',
    email: data.email || '',
    address: data.address || '',
    logo: data.logo || '',
    subscriptionPlan: data.subscription_plan || 'Sandbox',
    streamsPerClass: (data.streams_per_class) || DEFAULT_PROFILE.streamsPerClass,
    customSubjects: data.custom_subjects || {},
    boardingHouses: (data.boarding_houses) || DEFAULT_PROFILE.boardingHouses,
    custom_exams: (data.custom_exams) || DEFAULT_PROFILE.custom_exams,
    activeClasses: (data.active_classes) || DEFAULT_PROFILE.activeClasses,
    gradeFees: data.grade_fees || {},
    subscriptionStatus: data.subscription_status || 'Inactive',
    subscriptionExpiry: data.subscription_expiry || null,
    lastPaymentStatus: data.last_payment_status || 'none',
    gradingSystems: data.grading_systems || DEFAULT_PROFILE.gradingSystems,
    mpesa_config: data.mpesa_config || DEFAULT_PROFILE.mpesa_config,
    sms_config: data.sms_config || DEFAULT_PROFILE.sms_config,
    curriculum: data.curriculum || 'CBC Only',
    timetable_label: data.timetable_label || DEFAULT_PROFILE.timetable_label,
    schoolId: data.school_id,
    enabledModules: data.custom_subjects?.__shadow_enabled_modules || DEFAULT_PROFILE.enabledModules,
  };
}

/**
 * Helper to get school profile by optional explicit school ID (useful during login)
 */
export async function getSchoolProfileBySchoolId(schoolId) {
  if (!schoolId) return { ...DEFAULT_PROFILE };
  try {
    const { data, error } = await supabase
      .from('school_profiles')
      .select('*')
      .eq('school_id', schoolId)
      .single();
    
    if (error || !data) {
      const { data: school } = await supabase.from('schools').select('name, school_code, plan').eq('id', schoolId).single();
      return { 
        ...DEFAULT_PROFILE, 
        schoolName: school?.name || 'Institutional Portal',
        subscriptionPlan: school?.plan || 'Sandbox',
        schoolId: schoolId 
      };
    }
    return mapSchoolProfile(data);
  } catch (e) {
    return { ...DEFAULT_PROFILE, schoolId: schoolId };
  }
}

export async function getSchoolProfile() {
  if (!_currentSchoolId) return { ...DEFAULT_PROFILE };
  if (_profileCache) return _profileCache;
  if (_profilePromise) return _profilePromise;

  _profilePromise = (async () => {
    try {
    // PORTAL MODE: Use RPC to bypass RLS (portal users have no auth session)
    if (!_currentAuthUser && _currentSchoolId) {
      console.log('[PORTAL] Fetching school profile via RPC for school:', _currentSchoolId);
      try {
        const { data, error } = await supabase.rpc('portal_get_school_profile', { p_school_id: _currentSchoolId });
        if (!error && data && data.length > 0) {
          const mapped = mapProfileData(data[0]);
          _profileCache = mapped;
          return mapped;
        }
      } catch (rpcErr) {
        console.warn('[PORTAL] Profile RPC failed, falling back to direct query:', rpcErr.message);
      }
      // Fallback: use getSchoolProfileBySchoolId which has its own error handling
      const fallback = await getSchoolProfileBySchoolId(_currentSchoolId);
      _profileCache = fallback;
      return fallback;
    }

    // ADMIN MODE: Direct table query (has auth session)
    const { data, error } = await supabase
      .from('school_profiles')
      .select(SAFE_PROFILE_COLUMNS + ', school_id, custom_exams, grading_systems')
      .eq('school_id', _currentSchoolId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // If error is related to missing columns, fallback to safe base columns
      if (error.message?.includes('column') || error.hint?.includes('column')) {
        console.warn('DB Column mismatch, falling back to safe select:', error.message);
        const { data: safeData, error: safeError } = await supabase
          .from('school_profiles')
          .select(SAFE_PROFILE_COLUMNS)
          .eq('school_id', _currentSchoolId)
          .single();
        
        if (safeError && safeError.code !== 'PGRST116') throw safeError;
        if (!safeData) return { ...DEFAULT_PROFILE };
        const mapped = mapProfileData(safeData);
        _profileCache = mapped;
        saveProfileToLocal(_currentSchoolId, mapped);
        return mapped;
      }
      throw error;
    }
    
    if (!data) return { ...DEFAULT_PROFILE };
    const mapped = mapProfileData(data);
    
    // Auto-migrate legacy exams if found
    if (data.custom_exams && data.custom_exams.length > 0) {
      setTimeout(() => migrateLegacyExams(data.custom_exams), 100);
    }

    _profileCache = mapped;
    saveProfileToLocal(_currentSchoolId, mapped);
    return mapped;
  } catch (err) {
    console.error('getSchoolProfile critical failure:', err);
    // Try to recover from localStorage instead of showing placeholder defaults
    const localProfile = loadProfileFromLocal(_currentSchoolId);
    if (localProfile) {
      console.info('Recovered school profile from local cache (offline mode).');
      _profileCache = localProfile;
      return localProfile;
    }
    return { ...DEFAULT_PROFILE };
  } finally {
    _profilePromise = null;
  }
})();

  return _profilePromise;
}

// Helper to map DB columns to frontend shape with robust fallbacks
function mapProfileData(data) {
  if (!data) return DEFAULT_PROFILE;
  
  // Normalization utilities
  const trimArr = (arr) => (Array.isArray(arr) ? arr.map(s => s?.trim()).filter(Boolean) : null);
  const trimObjKeys = (obj) => {
    if (!obj) return null;
    const clean = {};
    Object.entries(obj).forEach(([k, v]) => {
      clean[k.trim()] = Array.isArray(v) ? trimArr(v) : v;
    });
    return clean;
  };

  // Naming resolution for subscription plan
  let plan = data.subscription_plan || 'Sandbox';

  return {
    schoolName: data.school_name || DEFAULT_PROFILE.schoolName,
    motto: data.motto || '',
    phone: data.phone || '',
    email: data.email || '',
    address: data.address || '',
    logo: data.logo || '',
    subscriptionPlan: plan,
    streamsPerClass: trimObjKeys(data.streams_per_class || data.custom_subjects?.__shadow_streams_per_class) || DEFAULT_PROFILE.streamsPerClass,
    customSubjects: data.custom_subjects || {},
    boardingHouses: trimArr(data.boarding_houses || data.custom_subjects?.__shadow_boarding_houses) || DEFAULT_PROFILE.boardingHouses,
    custom_exams: trimArr(data.custom_exams) || DEFAULT_PROFILE.custom_exams,
    activeClasses: trimArr(data.active_classes || data.custom_subjects?.__shadow_active_classes) || DEFAULT_PROFILE.activeClasses,
    gradeFees: data.grade_fees || {},
    setup_completed: data.setup_completed || data.custom_subjects?.__shadow_setup_completed || false,
    subscriptionStatus: data.subscription_status || 'Inactive',
    subscriptionExpiry: data.subscription_expiry || null,
    lastPaymentStatus: data.last_payment_status || 'none',
    gradingSystems: data.grading_systems || DEFAULT_PROFILE.gradingSystems,
    mpesa_config: {
      shortcode: data.mpesa_config?.shortcode || '',
      consumer_key: maskSecret(data.mpesa_config?.consumer_key),
      consumer_secret: maskSecret(data.mpesa_config?.consumer_secret),
      _encrypted: data.mpesa_config // Keep raw for saving later if unchanged
    },
    sms_config: {
      sender_id: data.sms_config?.sender_id || '',
      api_key: maskSecret(data.sms_config?.api_key),
      _encrypted: data.sms_config
    },
    curriculum: data.curriculum || 'CBC Only',
    custom_exams: trimArr(data.custom_exams) || DEFAULT_PROFILE.custom_exams,
    timetable_label: data.timetable_label || DEFAULT_PROFILE.timetable_label,
    _dbId: data.id,
    schoolId: data.school_id,
    schoolType: data.school_type || data.custom_subjects?.__shadow_school_type || 'Day',
    schoolCode: data.school_code,
    boardingHouses: trimArr(data.boarding_houses || data.custom_subjects?.__shadow_boarding_houses) || DEFAULT_PROFILE.boardingHouses,
    enabledModules: data.custom_subjects?.__shadow_enabled_modules || DEFAULT_PROFILE.enabledModules,
  };
}

// ============= SUBSCRIPTIONS & PAYMENTS =============
export async function checkIsSubscriptionActive(profile) {
  if (!profile) return false;
  
  // 1. Sandbox Authority: If the plan is Sandbox, it never expires.
  // Access is controlled by feature-gating (checkFeatureAccess), not by lockout.
  const plan = (profile.subscriptionPlan || profile.subscription_plan || '').toLowerCase();
  if (plan === SANDBOX_PLAN.toLowerCase()) {
    return true;
  }

  // 2. PLATFORM OVERRIDE: ShuleSoft HQ or Platform Admins are always active
  const isAdmin = await checkIsPlatformAdmin(_currentAuthUser?.email);
  if (isAdmin || profile.schoolName?.toLowerCase().includes('shulesoft hq')) return true;

  const now = new Date();

  // 3. Explicit deactivation/suspension wins
  if (profile.subscriptionStatus === 'Deactivated' || profile.subscriptionStatus === 'Suspended') return false;

  // 4. INDIVIDUAL FUTURE OVERRIDE - If school has an explicit future expiry, respect it above all
  if (profile.subscriptionExpiry) {
    const pExp = new Date(profile.subscriptionExpiry);
    if (!isNaN(pExp.getTime())) {
      // Set to end of day to avoid premature cutoff
      pExp.setHours(23, 59, 59, 999);
      if (pExp > now) return true;
    }
  }

  // 5. GLOBAL TERM EXPIRY - Platform-wide cutoff set by Super Admin (master source of truth)
  const globalExpiry = await getGlobalTermExpiry();
  if (globalExpiry) {
    const expDate = new Date(globalExpiry);
    if (!isNaN(expDate.getTime())) {
      // Set to end of day to avoid premature cutoff
      expDate.setHours(23, 59, 59, 999);
      if (expDate < now) return false;
    }
  }
  
  return profile.subscriptionStatus === 'Active';
}

/**
 * Check if the active school has access to a specific premium feature
 * based on their current subscription plan.
 */
export async function checkFeatureAccess(featureName, profile) {
  // 1. PLATFORM OVERRIDE: Platform Admins bypass all feature restrictions
  const isAdmin = await checkIsPlatformAdmin(_currentAuthUser?.email);
  if (isAdmin) return true;

  // 2. Load platform settings to get plan details
  const settings = await getPlatformSettings();
  if (!settings?.pricing) return false;

  // 3. Resolve the plan name (handling legacy field names)
  const planNameRaw = profile?.subscriptionPlan || profile?.subscription_plan || 'Sandbox';
  const planName = planNameRaw.toLowerCase();

  // 4. HARD-GATE FOR SANDBOX: Allow evaluation of core modules, but stay restricted on system integrations
  if (planName === 'sandbox') {
    const sandboxModules = [
      'student_mgmt', 'staff_mgmt', 'settings', 'dashboard', 
      'attendance', 'grading', 'fees', 'library', 'timetable', 
      'lms', 'sms', 'teacher_portal', 'parent_portal'
    ];
    return sandboxModules.includes(featureName.toLowerCase());
  }

  // 5. Find the plan in the pricing dictionary (Case-Insensitive lookup)
  const pricingKeys = Object.keys(settings.pricing);
  const matchedKey = pricingKeys.find(k => k.toLowerCase() === planName);
  const plan = matchedKey ? settings.pricing[matchedKey] : null;

  if (!plan) return false;

  // 6. MODULE-BASED GATING: Check if the module slug is enabled for this plan
  // We check the 'modules' array (hard control) instead of the 'features' array (marketing text)
  return Array.isArray(plan.modules) && plan.modules.some(m => 
    m.toLowerCase() === featureName.toLowerCase() || 
    m.toLowerCase().includes(featureName.toLowerCase())
  );
}

export async function submitPayment(amount, transactionCode, notes = '') {
  mutationGuard('submitPayment');
  if (!_currentSchoolId) throw new Error('No school context');
  const { error } = await supabase
    .from('payments')
    .insert([{
      school_id: _currentSchoolId,
      amount,
      transaction_code: transactionCode,
      notes,
      status: 'Pending'
    }]);
  if (error) throw error;

  // Update last payment status in school profile
  await supabase
    .from('school_profiles')
    .update({ last_payment_status: 'pending' })
    .eq('school_id', _currentSchoolId);

  await logPlatformActivity('PAYMENT_SUBMIT', `New payment of KSh ${amount.toLocaleString()} submitted via code: ${transactionCode}`, _currentSchoolId);
}

export async function getPayments() {
  if (!_currentSchoolId) return [];
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, transaction_code, notes, status, created_at, school_id')
    .eq('school_id', _currentSchoolId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAllPendingPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, transaction_code, notes, status, created_at, school_id, school_profiles(school_name)')
    .eq('status', 'Pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAllPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, transaction_code, notes, status, created_at, school_id, school_profiles(school_name, subscription_plan)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function approvePayment(paymentId, schoolId, monthsToAdd = 4) {
  mutationGuard('approvePayment');
  // 1. Update payment status
  const { error: pError } = await supabase
    .from('payments')
    .update({ status: 'Approved' })
    .eq('id', paymentId);
  if (pError) throw pError;

  // 1.5 Calculate new expiry
  const { data: profileData } = await supabase
    .from('school_profiles')
    .select('subscription_expiry')
    .eq('school_id', schoolId)
    .single();

  let expiry = new Date();
  if (profileData && profileData.subscription_expiry) {
    const currentExpiry = new Date(profileData.subscription_expiry);
    if (currentExpiry > expiry) {
      expiry = currentExpiry;
    }
  }
  expiry.setMonth(expiry.getMonth() + monthsToAdd);

  // 2. Update school profile
  const { error: sError } = await supabase
    .from('school_profiles')
    .update({ 
      subscription_status: 'Active',
      subscription_expiry: expiry.toISOString(),
      last_payment_status: 'approved'
    })
    .eq('school_id', schoolId);
  if (sError) throw sError;

  // 3. Sync status to schools table
  await supabase
    .from('schools')
    .update({ status: 'Active' })
    .eq('id', schoolId);

  await logPlatformActivity('PAYMENT_APPROVE', `Approved payment for ${schoolId}`, schoolId);
}



export async function saveSchoolProfile(profile) {
  console.log('store: saveSchoolProfile called', { profile, _currentSchoolId });
  if (!_currentSchoolId) {
    console.error('store: saveSchoolProfile FAILED - _currentSchoolId is null');
    return;
  }
  const row = {
    school_id: _currentSchoolId,
    school_name: profile.schoolName,
    motto: profile.motto || '',
    phone: profile.phone || '',
    email: profile.email || '',
    address: profile.address || '',
    logo: profile.logo || '',
    subscription_plan: profile.subscriptionPlan || 'Basic',
    setup_completed: profile.setup_completed || false,
    streams_per_class: profile.streamsPerClass || defaultStreamsPerClass,
    active_classes: profile.activeClasses || DEFAULT_PROFILE.activeClasses,
    grade_fees: profile.gradeFees || {},
    boarding_houses: profile.boardingHouses || [],
    school_type: profile.schoolType || 'Day',
    custom_subjects: profile.customSubjects || {},
    custom_exams: profile.custom_exams || DEFAULT_PROFILE.custom_exams,
    timetable_label: profile.timetable_label || DEFAULT_PROFILE.timetable_label,
    grading_systems: profile.grading_systems || DEFAULT_PROFILE.grading_systems,
    curriculum: profile.curriculum || 'CBC Only',
    updated_at: new Date().toISOString(),
  };

  // Encrypt sensitive fields if they were modified (not masked)
  const mpesa = { ...profile.mpesa_config };
  const sms = { ...profile.sms_config };

  const encryptIfNew = async (val, oldEncrypted) => {
    if (!val) return null;
    if (val.includes('...********')) return oldEncrypted; // Use old encrypted value if masked
    return await encrypt(val, _currentSchoolId);
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

  // FINAL DEFENSIVE SANITIZATION
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
          if (payload[possibleCol] !== undefined) {
            foundCol = possibleCol;
            break;
          }
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

  if (!_currentSchoolId) {
    throw new Error("School Identification Lost. Please refresh your browser or log in again.");
  }

  // Linearize the save process to prevent hangs
  await attemptSave(row);

  // Perform Shadow Save in the background (Non-blocking fallback)
  const performShadowSave = async () => {
    try {
      const shadowBlob = { ...(profile.customSubjects || {}) };
      shadowBlob.__shadow_setup_completed = profile.setup_completed === true;
      shadowBlob.__shadow_school_type = profile.schoolType || 'Day';
      shadowBlob.__shadow_boarding_houses = profile.boardingHouses || [];
      shadowBlob.__shadow_active_classes = profile.activeClasses || [];
      shadowBlob.__shadow_streams_per_class = profile.streamsPerClass || {};
      shadowBlob.__shadow_enabled_modules = profile.enabledModules || DEFAULT_PROFILE.enabledModules;
      
      await supabase
        .from('school_profiles')
        .update({ custom_subjects: shadowBlob })
        .eq('school_id', _currentSchoolId);
    } catch (e) { console.error('Background Shadow Save failed:', e); }
  };

  performShadowSave(); // Don't await this if it might hang

  _profileCache = null;

  // Update schools table (secondary priority)
  try {
    await supabase.from('schools').update({ 
      name: profile.schoolName, 
      plan: profile.subscriptionPlan,
      phone: profile.phone,
      location: profile.address
    }).eq('id', _currentSchoolId);
  } catch (e) { console.warn('Secondary schools table update failed:', e); }

  window.dispatchEvent(new Event('schoolProfileChanged'));

  return { success: true, skipped: skippedColumns };
}

// ============= ACADEMIC PERIODS =============
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
    _currentPeriodId = data.id;
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
  
  _currentPeriodId = periodId;
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
  _currentPeriodId = active.id;
  return active;
}

export async function getCurrentPeriodDetails() {
  const periods = await getPeriods();
  return periods.find(p => p.id === _currentPeriodId) || null;
}



// Helper: returns HTML snippet for print headers
export async function getPrintHeader(subtitle) {
  const p = await getSchoolProfile();
  const name = p.schoolName || '';
  
  let logoUrl = p.logo;
  if (logoUrl && (logoUrl.startsWith('/') || logoUrl.startsWith('.'))) {
    // Resolve relative logo URL because about:blank breaks relative paths
    logoUrl = window.location.origin + (logoUrl.startsWith('.') ? logoUrl.substring(1) : logoUrl);
  }
  
  const logoHtml = logoUrl ? `<img src="${logoUrl}" style="height:60px;max-width:120px;object-fit:contain;margin-right:14px" />` : '';
  const mottoHtml = p.motto ? `<div style="font-size:11px;color:#64748b;font-style:italic;margin-top:2px">"${p.motto}"</div>` : '';
  const contactParts = [p.phone, p.email, p.address].filter(Boolean);
  const period = await getCurrentPeriodDetails();
  const periodStr = period ? `${period.year} ${period.term}` : '';
  const contactText = contactParts.join(' | ');
  return `
    <div style="display:flex;align-items:center;border-bottom:2px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px">
      ${logoHtml}
      <div style="flex:1">
        <div style="font-size:22px;font-weight:800;color:#1e3a5f;text-transform:uppercase;letter-spacing:1px">${name}</div>
        ${mottoHtml}
        <div style="font-size:12px;color:#475569;margin-top:4px">${contactText}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
          <div style="font-size:13px;font-weight:700;color:#0369a1;text-transform:uppercase">${subtitle}</div>
          <div style="font-size:11px;color:#64748b;font-weight:600">${periodStr}</div>
        </div>
      </div>
    </div>
  `;
}

export function getPrintFooter() {
  return `
    <style>
      @media print {
        @page { margin: 0; }
        .shulesoft-system-footer svg rect { fill: #000 !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      }
    </style>
    <div class="shulesoft-system-footer" style="position:fixed;bottom:5mm;left:15mm;display:flex;align-items:center;opacity:1;z-index:9999;color:#000;">
      <svg width="22" height="22" viewBox="0 0 13 13" fill="none" aria-label="ShuleSoft">
        <rect x="1" y="1" width="4.5" height="4.5" rx="1" fill="#000"/>
        <rect x="7.5" y="1" width="4.5" height="4.5" rx="1" fill="#000" fill-opacity="0.4"/>
        <rect x="1" y="7.5" width="4.5" height="4.5" rx="1" fill="#000" fill-opacity="0.4"/>
        <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" fill="#000" fill-opacity="0.2"/>
      </svg>
    </div>
  `;
}

/**
 * Global helper to calculate grade based on score and school profile
 */
export function getGradeForScore(score, className, profile) {
  const level = getLevelForGrade(className);
  const scale = profile.gradingSystems?.[className] || 
                profile.gradingSystems?.[level] || 
                profile.gradingSystems?.default || [
                  {min: 80, max: 100, grade: 'A', color: '#10b981'},
                  {min: 70, max: 79, grade: 'B', color: '#3b82f6'},
                  {min: 60, max: 69, grade: 'C', color: '#f59e0b'},
                  {min: 50, max: 59, grade: 'D', color: '#f97316'},
                  {min: 0, max: 49, grade: 'E', color: '#ef4444'}
                ];
  
  const matched = scale.find(s => score >= s.min && score <= s.max);
  if (matched) return { grade: matched.grade || matched.symbol, color: matched.color };
  return { grade: '?', color: '#64748b' };
}

// ============= USERS / SECURITY =============
export async function getUsers() {
  if (!_currentSchoolId) return [];
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, school_id, auth_user_id')
    .eq('school_id', _currentSchoolId);
  if (error) throw error;
  return data || [];
}

export async function saveUsers(users) {
  mutationGuard('saveUsers');
  // Bulk update
  const admins = users.filter(u => u.role === 'Admin');
  if (admins.length > 1) {
    throw new Error("Only one Administrator per school is allowed.");
  }
  for (const user of users) {
    await supabase.from('users')
      .update({ name: user.name, email: user.email, role: user.role })
      .eq('id', user.id);
  }
}

export async function addUser(user) {
  mutationGuard('addUser');
  if (user.role === 'Admin') {
    const existing = await getUsers();
    if (existing.some(u => u.role === 'Admin')) {
      throw new Error("Only one Administrator is allowed per school.");
    }
  }
  // Use the RPC to securely create an Auth identity and a public.user record
  const { data, error } = await supabase.rpc('invite_sub_admin', {
    new_email: user.email,
    new_name: user.name,
    new_role: user.role,
    new_password: user.password || 'password123',
    target_school_id: getCurrentSchoolId()
  });

  if (error) {
    throw new Error(error.message || 'Failed to add user. Ensure they do not already exist.');
  }
  
  return data;
}

export async function deleteUser(id) {
  mutationGuard('deleteUser');
  // Prevent deleting oneself
  const { data: { session } } = await supabase.auth.getSession();
  const all = await getUsers();
  const targetUser = all.find(u => u.id === id);

  if (targetUser && session?.user?.id === targetUser.auth_user_id) {
    throw new Error("You cannot delete your own account.");
  }

  // Also prevent deleting the owner of the school
  const { data: school } = await supabase
    .from('schools')
    .select('owner_id')
    .eq('id', _currentSchoolId)
    .single();

  if (school && targetUser && school.owner_id === targetUser.auth_user_id) {
    throw new Error("Cannot delete the primary school owner.");
  }

  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw error;
}

export async function getUserByAuthId(authUserId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, school_id, auth_user_id, password_changed, login_username, schools(id, name, plan, school_code)')
    .eq('auth_user_id', authUserId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function setSelfPassword(newPassword, oldPassword = null) {
  mutationGuard('setSelfPassword');
  
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  // 1. If project requires old password, verify credentials
  if (oldPassword && user.email) {
    // Attempt re-authentication (Standard Supabase v2)
    if (typeof supabase.auth.reauthenticateWithPassword === 'function') {
      const { error: reauthErr } = await supabase.auth.reauthenticateWithPassword({ password: oldPassword });
      if (reauthErr) throw new Error(`Verification failed: ${reauthErr.message}`);
    } 
    // Fallback to fresh sign-in if reauthenticate is missing from library version
    else {
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword
      });
      if (verifyErr) throw new Error(`Verification failed: ${verifyErr.message}`);
    }
  }
  
  // 2. Update Auth Identity
  const { data: authData, error: authError } = await supabase.auth.updateUser({
    password: newPassword
  });
  if (authError) throw authError;

  // 3. Update users table password_changed flag
  const { error: dbError } = await supabase
    .from('users')
    .update({ password_changed: true })
    .eq('auth_user_id', user.id);
  if (dbError) throw dbError;
}


// ============= STUDENTS =============
/**
 * Get students for the current school (Offline-First)
 */
export async function getStudents() {
  if (!_currentSchoolId) return [];
  
  // Try to load from offline cache first (SWR)
  const cached = await db.students.where('school_id').equals(_currentSchoolId).toArray();
  
  // Background fetch from cloud
  const fetchCloud = async () => {
    if (!shouldFetchCloud(`students_${_currentSchoolId}`)) return;
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', _currentSchoolId)
        .order('name');
      if (error) throw error;
      if (data) {
        // Update offline cache
        await db.students.bulkPut(data.map(s => ({ ...s, school_id: _currentSchoolId })));
        window.dispatchEvent(new Event('studentsSynced'));
      }
    } catch (e) {
      console.warn("Offline fetch: showing cached students.", e.message);
    }
  };
  
  fetchCloud(); // Fire and forget for internal sync
  
  if (cached.length > 0) {
    return cached.map(s => ({
      ...s,
      admNo: s.adm_no,
      residenceType: s.residence_type || 'day',
      parentPhone: s.parent_phone,
      joinDate: s.join_date,
      birthCertNo: s.birth_cert_no,
      fatherName: s.father_name,
      fatherPhone: s.father_phone,
      motherName: s.mother_name,
      motherPhone: s.mother_phone,
      nemisVerified: s.nemis_verified,
      status: s.status || 'Active'
    }));
  }
  
  // If no cache, wait for cloud
  const { data, error } = await supabase.from('students').select('*').eq('school_id', _currentSchoolId).order('name');
  if (error) throw error;
  if (data) await db.students.bulkPut(data.map(s => ({ ...s, school_id: _currentSchoolId })));
  return (data || []).map(s => ({
    ...s,
    admNo: s.adm_no,
    residenceType: s.residence_type || 'day',
    house: s.house || null,
    parentPhone: s.parent_phone,
    joinDate: s.join_date,
    birthCertNo: s.birth_cert_no,
    fatherName: s.father_name,
    fatherPhone: s.father_phone,
    motherName: s.mother_name,
    motherPhone: s.mother_phone,
    nemisVerified: s.nemis_verified,
    status: s.status || 'Active'
  }));
}

/**
 * Perform a deep audit of student data for NEMIS (MoE) compliance.
 * Returns statistics and lists of students with missing critical data.
 */
export async function getNEMISComplianceReport() {
  const students = await getStudents();
  const report = {
    total: students.length,
    ready: 0,
    nonReady: 0,
    readinessRate: 0,
    missingStats: {
      upi: 0,
      dob: 0,
      gender: 0,
      birth_cert: 0,
      parent_contact: 0,
      class_stream: 0
    },
    studentsWithIssues: []
  };

  students.forEach(s => {
    const issues = [];
    if (!s.nemis_number && !s.upi) {
      issues.push('Missing UPI/NEMIS Number');
      report.missingStats.upi++;
    }
    if (!s.date_of_birth && !s.dob) {
      issues.push('Missing Date of Birth');
      report.missingStats.dob++;
    }
    if (!s.gender) {
      issues.push('Missing Gender');
      report.missingStats.gender++;
    }
    if (!s.parent_phone && !s.parentPhone) {
      issues.push('Missing Parent Contact');
      report.missingStats.parent_contact++;
    }
    if (!s.birth_cert_no && !s.birthCertNo) {
      issues.push('Missing Birth Certificate No');
      report.missingStats.birth_cert++;
    }
    if (!s.class) {
      issues.push('Missing Class Assignment');
      report.missingStats.class_stream++;
    }

    if (issues.length === 0) {
      report.ready++;
    } else {
      report.nonReady++;
      report.studentsWithIssues.push({
        id: s.id,
        name: s.name,
        admNo: s.admNo,
        class: s.class,
        issues
      });
    }
  });

  report.readinessRate = ((report.ready / (report.total || 1)) * 100).toFixed(1);
  return report;
}

export async function getStudent(id) {
  const { data, error } = await supabase
    .from('students')
    .select('id, name, adm_no, class, stream, parent, parent_phone, gender, dob, join_date, notes, school_id, birth_cert_no, county, father_name, father_phone, mother_name, mother_phone, residence_type, house, subjects')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data ? { ...data, admNo: data.adm_no, parentPhone: data.parent_phone, joinDate: data.join_date, residenceType: data.residence_type || 'day', house: data.house || null } : null;
}

export async function addStudent(student) {
  mutationGuard('addStudent');
  const all = await getStudents();
  const p = await getSchoolProfile();
  const planName = p.subscriptionPlan || 'Sandbox';
  
  // Robust plan lookup matching other components
  const planLimits = await getPlanLimits(planName);
  const maxStudents = planLimits.students || 5;
  
  if (all.length >= maxStudents) {
    throw new Error(`Student limit reached for your ${planName} plan (${maxStudents} students). Please upgrade your plan in Settings.`);
  }

  const count = all.length + 1;
  const admNo = student.admNo || `SS-2024-${String(count).padStart(3, '0')}`;

  const { data, error } = await supabase
    .from('students')
    .insert({
      school_id: _currentSchoolId,
      adm_no: admNo,
      name: student.name,
      class: student.class,
      stream: student.stream || 'General',
      parent: student.parent || '',
      residence_type: student.residenceType || 'day',
      house: student.house || null,
      parent_phone: student.parentPhone || '',
      gender: student.gender || '',
      dob: student.dob || '',
      join_date: student.joinDate || new Date().toISOString().split('T')[0],
      notes: sanitizeString(student.notes || ''),
      birth_cert_no: student.birthCertNo || null,
      county: student.county || null,
      father_name: sanitizeName(student.fatherName || null),
      father_phone: student.fatherPhone || null,
      mother_name: sanitizeName(student.motherName || null),
      mother_phone: student.motherPhone || null,
      status: student.status || 'Active',
      subjects: getSubjectsForGrade(student.class, p)
    })
    .select()
    .single();
  if (error) throw error;

  // Create fee record for new student
  const baseFee = p.gradeFees?.[student.class] || TERM_FEE;
  await supabase.from('fees').insert({
    school_id: _currentSchoolId,
    student_id: data.id,
    period_id: _currentPeriodId,
    total_fee: baseFee,
    paid: 0,
    balance: baseFee,
  });

  await logPlatformActivity('STUDENT_ADD', `Added new student: ${student.name}`);
  const newStudent = { 
    ...data, 
    admNo: data.adm_no, 
    residenceType: data.residence_type || 'day',
    house: data.house || null,
    parentPhone: data.parent_phone, 
    joinDate: data.join_date,
    birthCertNo: data.birth_cert_no,
    fatherName: data.father_name,
    fatherPhone: data.father_phone,
    motherName: data.mother_name,
    motherPhone: data.mother_phone,
    subjects: data.subjects || [],
    status: data.status || 'Active',
    nemisVerified: false
  };

  // Sync to local DB immediately for UI responsiveness
  try { await db.students.put(data); } catch(e) {}

  return newStudent;
}

export async function updateStudent(id, updates) {
  mutationGuard('updateStudent');
  const row = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.class !== undefined) row.class = updates.class;
  if (updates.stream !== undefined) row.stream = updates.stream;
  if (updates.parent !== undefined) row.parent = updates.parent;
  if (updates.residenceType !== undefined) row.residence_type = updates.residenceType;
  if (updates.house !== undefined) row.house = updates.house;
  if (updates.parentPhone !== undefined) row.parent_phone = updates.parentPhone;
  if (updates.gender !== undefined) row.gender = updates.gender;
  if (updates.dob !== undefined) row.dob = updates.dob;
  if (updates.joinDate !== undefined) row.join_date = updates.joinDate;
  if (updates.notes !== undefined) row.notes = updates.notes;
  if (updates.admNo !== undefined) row.adm_no = updates.admNo;
  if (updates.birthCertNo !== undefined) row.birth_cert_no = updates.birthCertNo;
  if (updates.county !== undefined) row.county = updates.county;
  if (updates.fatherName !== undefined) row.father_name = updates.fatherName;
  if (updates.fatherPhone !== undefined) row.father_phone = updates.fatherPhone;
  if (updates.motherName !== undefined) row.mother_name = updates.motherName;
  if (updates.motherPhone !== undefined) row.mother_phone = updates.motherPhone;
  if (updates.subjects !== undefined) row.subjects = updates.subjects;
  if (updates.status !== undefined) row.status = updates.status;

  const { data, error } = await supabase
    .from('students')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  
  // Sync to local DB immediately
  try { await db.students.put(data); } catch(e) {}
  return data ? { ...data, admNo: data.adm_no, parentPhone: data.parent_phone, joinDate: data.join_date, residenceType: data.residence_type || 'day', house: data.house || null, subjects: data.subjects || [], status: data.status || 'Active' } : null;
}

/**
 * MIGRATION: Auto-assign all default subjects to existing students if they have none.
 */
export async function migrateExistingStudentsSubjects() {
  const students = await getStudents();
  const profile = await getSchoolProfile();
  let migrated = 0;

  for (const s of students) {
    if (!s.subjects || s.subjects.length === 0) {
      const defaultSubs = getSubjectsForGrade(s.class, profile);
      await updateStudent(s.id, { subjects: defaultSubs });
      migrated++;
    }
  }
  return migrated;
}

export async function deleteStudent(id) {
  mutationGuard('deleteStudent');
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw error;
  // Sync to local DB immediately
  try { await db.students.delete(id); } catch(e) {}
}

/**
 * Archive a student record (Soft Delete).
 * Transfers the student to a specific inactive category like 'Transferred' or 'Graduated'.
 */
export async function archiveStudent(id, targetStatus = 'Transferred', reason = '') {
  mutationGuard('archiveStudent');
  const { data, error } = await supabase
    .from('students')
    .update({ 
      status: targetStatus,
      notes: reason ? `[ARCHIVED: ${new Date().toLocaleDateString()}] ${reason}` : undefined
    })
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  
  // Update local cache
  try { await db.students.update(id, { status: targetStatus }); } catch(e) {}
  await logPlatformActivity('STUDENT_ARCHIVE', `Archived student (Status: ${targetStatus}): ${data.name}`);
  return data;
}

export async function transferStudents(selectedIds, direction = 'promote') {
  mutationGuard('transferStudents');
  const allGrades = Object.values(CBC_STRUCTURE).flatMap(l => l.grades);
  const students = (await getStudents()).filter(s => s.status === 'Active');
  const targetStudents = students.filter(s => selectedIds.includes(s.id));
  const updates = [];

  targetStudents.forEach(s => {
    const idx = allGrades.indexOf(s.class);
    if (direction === 'promote') {
      if (idx >= 0 && idx < allGrades.length - 1) {
        updates.push({ id: s.id, newClass: allGrades[idx + 1] });
      }
    } else if (direction === 'demote') {
      if (idx > 0) {
        updates.push({ id: s.id, newClass: allGrades[idx - 1] });
      }
    }
  });

  for (const u of updates) {
    const { error } = await supabase.from('students').update({ class: u.newClass }).eq('id', u.id);
    if (error) throw error;
  }
  return await getStudents();
}

// ============= MARKS =============
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
  if (!_currentAuthUser && _currentSchoolId && classId) {
    const { data, error } = await supabase.rpc('portal_get_class_students', { 
      p_school_id: _currentSchoolId,
      p_class_id: classId
    });
    if (error) throw error;
    students = data || [];
  } else {
    students = (await getStudents()).filter(s => s.class === className);
  }

  // 1. Filter by Stream (Strict)
  if (streamName) {
    const sLower = streamName.toLowerCase();
    students = students.filter(s => 
      (s.stream && s.stream.toLowerCase() === sLower) || 
      (s.class && s.class.toLowerCase().includes(sLower))
    );
  }

  // 2. Filter by Subject (Strict Enrollment Only)
  if (subjectName) {
    const subLower = subjectName.toLowerCase();
    students = students.filter(s => {
      if (!s.subjects || s.subjects.length === 0) return false;
      return s.subjects.some(sub => sub.toLowerCase().includes(subLower) || subLower.includes(sub.toLowerCase()));
    });
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

// ============= FORMAL EXAMS (Phase 4) =============

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
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('school_id', _currentSchoolId)
      // We return all exams for the school so admins can manage them across terms
      // but we sort them by period/created_at
      .order('created_at', { ascending: false });
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
export async function createExam(name, type = 'endterm', term = 'Current', status = 'published') {
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
export async function updateExamStatus(examId, status) {
  mutationGuard('updateExamStatus');
  const { error } = await supabase
    .from('exams')
    .update({ status })
    .eq('id', examId);

  if (error) throw error;
  invalidateCache(`exams_${_currentSchoolId}_${_currentPeriodId}`);
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

  // If in portal mode (no auth user but school id set), use RPC
  if (!_currentAuthUser && _currentSchoolId) {
    const { data, error } = await supabase.rpc('portal_get_student_results', { p_student_id: studentId });
    if (error) throw error;
    return data || [];
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

export async function getFees(studentId = null) {
  if (!_currentSchoolId) return studentId ? null : {};

  // If in portal mode or searching for specific student, use RPC if possible
  if (!_currentAuthUser && studentId) {
    let feeData = null;
    let payData = [];

    try {
      const feeRes = await supabase.rpc('portal_get_student_fees', { p_student_id: studentId });
      if (!feeRes.error) feeData = feeRes.data;
    } catch (e) {
      console.warn('Portal fee fetch error:', e);
    }

    try {
      const payRes = await supabase.rpc('portal_get_student_payments', { p_student_id: studentId });
      if (!payRes.error) payData = payRes.data;
    } catch (e) {
      console.warn('Portal payments fetch error:', e);
    }

    const payments = (Array.isArray(payData) ? payData : []).map(p => ({
      id: p.id,
      amount: Number(p.amount || 0),
      date: p.date,
      method: p.method || 'Payment',
      reference: p.reference || '',
    }));

    return {
      totalFee: Number(feeData?.total_fee || 0),
      paid: Number(feeData?.paid || 0),
      balance: Number(feeData?.balance || 0),
      payments,
      _feeId: feeData?.id || null,
      periodId: feeData?.period_id || null,
    };
  }

  const cacheKey = `fees_${_currentSchoolId}_${_currentPeriodId}`;
  return cachedQuery(cacheKey, async () => {
    const { data, error } = await supabase
      .from('fees')
      .select('id, student_id, total_fee, paid, balance, period_id, school_id, fee_payments(id, amount, date, method, reference)')
      .eq('school_id', _currentSchoolId)
      .eq('period_id', _currentPeriodId);
    if (error) throw error;
    
    const fees = {};
    (data || []).forEach(row => {
      fees[row.student_id] = {
        totalFee: Number(row.total_fee),
        paid: Number(row.paid),
        balance: Number(row.balance),
        payments: (row.fee_payments || []).map(p => ({
          id: p.id,
          amount: Number(p.amount),
          date: p.date,
          method: p.method,
          reference: p.reference,
        })),
        _feeId: row.id,
        periodId: row.period_id,
      };
    });

    // Background Repair: Detect records with 0 total_fee and trigger reconciliation
    Object.keys(fees).forEach(sid => {
      if (fees[sid].totalFee === 0) {
        reconcileStudentFee(sid, fees[sid]).catch(console.error);
      }
    });

    return fees;
  });
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

export async function recordPayment(studentId, amount, method, reference) {
  const numAmount = Math.max(0, Number(amount) || 0);
  if (numAmount === 0) throw new Error('Payment amount must be greater than zero.');
  
  const sanitizedRef = (reference || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const fees = await getFees();
  let feeRecord = fees[studentId];

  // 1. If no fee record exists, we must create one. 
  // But we MUST have a configuration set first.
  if (!feeRecord) {
    const student = (await getStudents()).find(s => s.id === studentId);
    const profile = await getSchoolProfile();
    const finalFee = getCalculatedTotalFee(student, profile);

    if (finalFee === null) {
      throw new Error(`Fee structure not configured for ${student?.class || 'this class'}. Please set fees in Settings before recording payments.`);
    }

    const { data: newFee, error: feeErr } = await supabase
      .from('fees')
      .insert({ 
        school_id: _currentSchoolId, 
        student_id: studentId, 
        period_id: _currentPeriodId,
        total_fee: finalFee, 
        paid: 0, 
        balance: finalFee 
      })
      .select()
      .single();
    if (feeErr) throw feeErr;
  }

  // 1. Fetch current fee record and reconcile it with latest config
  const { data: currentFee, error: fetchErr } = await supabase
    .from('fees')
    .select('id, total_fee, paid, balance')
    .eq('school_id', _currentSchoolId)
    .eq('student_id', studentId)
    .eq('period_id', _currentPeriodId)
    .single();

  if (fetchErr) throw fetchErr;

  // 1.5 Reconcile the total_fee and balance before processing payment
  const reconciled = await reconcileStudentFee(studentId, {
    totalFee: Number(currentFee.total_fee),
    paid: Number(currentFee.paid),
    balance: Number(currentFee.balance),
    _feeId: currentFee.id
  });

  const targetFeeId = currentFee.id;
  const upToDateTotalFee = Number(reconciled?.totalFee || currentFee.total_fee);
  const upToDatePaid = Number(reconciled?.paid || currentFee.paid);

  // Missing RPC fallback: Perform the operation client-side
  const paymentDate = new Date().toISOString().split('T')[0];
  const amountNum = Number(amount);

  // 2. Insert the payment record with the required fee_id
  const { data: paymentRecord, error: paymentErr } = await supabase
    .from('fee_payments')
    .insert({
      school_id: _currentSchoolId,
      student_id: studentId,
      period_id: _currentPeriodId,
      fee_id: targetFeeId, // Added to fix not-null constraint
      amount: amountNum,
      method: method || 'Cash',
      reference: sanitizedRef,
      date: paymentDate
    })
    .select()
    .single();

  if (paymentErr) throw paymentErr;

  // 3. Update the fee balance
  const { error: updateErr } = await supabase
    .from('fees')
    .update({ 
      paid: upToDatePaid + amountNum, 
      balance: upToDateTotalFee - (upToDatePaid + amountNum) 
    })
    .eq('school_id', _currentSchoolId)
    .eq('student_id', studentId)
    .eq('period_id', _currentPeriodId);

  if (updateErr) throw updateErr;

  // 3.5 Invalidate caches so the UI sees the new balance immediately
  invalidateCache(`fees_${_currentSchoolId}_${_currentPeriodId}`);
  invalidateCache(`summary_${_currentSchoolId}_${_currentPeriodId}`);

  // 4. Queue Payment Confirmation SMS
  const student = (await getStudents()).find(s => s.id === studentId);
  if (student && student.parent_phone) {
    await queueSMS(
      student.parent_phone, 
      `ShuleSoft: We have received KSh ${amount.toLocaleString()} for ${student.name}. Balance: KSh ${(feeRecord?.balance - amount).toLocaleString()}. Ref: ${reference || 'N/A'}`,
      'fee_payment'
    );
  }
  
  return { 
    id: `RCT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 
    amount: Number(amount), 
    method, 
    reference, 
    date: paymentDate 
  };
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

export async function getFeeSummary(preFetchedFees = null, preFetchedStudents = null, preFetchedProfile = null) {
  const fees = preFetchedFees || await getFees();
  const students = preFetchedStudents || await getStudents();
  const profile = preFetchedProfile || await getSchoolProfile();
  const gradeFees = profile.gradeFees || {};
  
  let totalExpected = 0, totalCollected = 0, totalOutstanding = 0;
  let fullyPaid = 0, partialPaid = 0, unpaid = 0;
  students.forEach(s => {
    let defaultFee = TERM_FEE;
    if (gradeFees[s.class]) {
      if (typeof gradeFees[s.class] === 'object') {
        const resType = (s.residenceType || 'day').toLowerCase();
        defaultFee = Number(gradeFees[s.class][resType]) || Number(gradeFees[s.class].day) || TERM_FEE;
      } else {
        defaultFee = Number(gradeFees[s.class]) || TERM_FEE;
      }
    }
    const f = fees[s.id] || { totalFee: defaultFee, paid: 0, balance: defaultFee };
    totalExpected += (Number(f.totalFee) || 0);
    totalCollected += (Number(f.paid) || 0);
    totalOutstanding += (Number(f.balance) || 0);
    if (f.balance <= 0) fullyPaid++;
    else if (f.paid > 0) partialPaid++;
    else unpaid++;
  });
  return { totalExpected, totalCollected, totalOutstanding, fullyPaid, partialPaid, unpaid };
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

/**
 * Securely validate a staff member (teacher) login using School + Phone + PIN
 */
export async function validateStaffLogin(schoolSearch, phone, pin, schoolId = null) {
  const queryParam = schoolId || schoolSearch;

  const { data, error } = await supabase.rpc('validate_staff_portal_login', {
    p_school_search: queryParam,
    p_phone: phone,
    p_pin: pin
  });

  if (error) {
    throw new Error('Database connection error. Please try again.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!data || !data.id) {
    throw new Error('Invalid credentials.');
  }

  const selectedSchoolId = data.schoolId || data.school_id;

  // 2. Resolve profile and check subscription/feature
  const profile = await getSchoolProfileBySchoolId(selectedSchoolId);
  
  // Subscription Gate
  const isSubActive = await checkIsSubscriptionActive(profile);
  if (!isSubActive) {
    throw new Error('Your institution\'s ShuleSoft subscription has expired. Access to the Staff Portal is restricted.');
  }

  // Feature Gate
  const hasFeature = await checkFeatureAccess('teacher_portal', profile);
  if (!hasFeature) {
    throw new Error('The Staff Portal feature is not active for your institution\'s current plan.');
  }

  // Pass through both user_id and teacher_record_id for dual-ID matching
  return {
    id: data.id,
    name: data.name,
    role: 'teacher',
    school_id: selectedSchoolId,
    schoolId: selectedSchoolId,  // backward compat
    teacher_record_id: data.teacher_record_id || data.id,  // teachers table ID
    user_id: data.user_id || data.id  // users table ID
  };
}

// ============= TEACHERS =============
export async function getTeachers() {
  if (!_currentSchoolId) return [];
  
  // Try to load from offline cache first
  const cached = await db.teachers.where('school_id').equals(_currentSchoolId).toArray();

  const fetchCloud = async () => {
    if (!shouldFetchCloud(`teachers_${_currentSchoolId}`)) return;
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, name, email, phone, subjects, school_id, on_leave, staff_code, status, tsc_number')
        .eq('school_id', _currentSchoolId);
      if (error) throw error;
      if (data) {
        await db.teachers.bulkPut(data.map(t => ({ ...t, school_id: _currentSchoolId })));
        window.dispatchEvent(new Event('teachersSynced'));
      }
    } catch (e) {
      console.warn("Offline fetch: showing cached teachers.", e.message);
    }
  };

  fetchCloud();

  if (cached.length > 0) return cached.map(t => ({ ...t, status: t.status || 'Active' }));

  const { data, error } = await supabase
    .from('teachers')
    .select('id, name, email, phone, subjects, school_id, on_leave, staff_code, status, tsc_number')
    .eq('school_id', _currentSchoolId);
  if (error) throw error;
  if (data) await db.teachers.bulkPut(data.map(t => ({ ...t, school_id: _currentSchoolId })));
  return data || [];
}

/**
 * Update teacher leave status
 */
export async function setTeacherLeaveStatus(teacherId, onLeave) {
  const { error } = await supabase
    .from('teachers')
    .update({ on_leave: onLeave })
    .eq('id', teacherId);
  
  if (error) throw error;
  
  // Update local cache
  await db.teachers.update(teacherId, { on_leave: onLeave });
  return { success: true };
}

// ============= SAAS BLOG & MARKETING =============

const INITIAL_BLOG_POSTS = [
  {
    id: 'post-feature-guide',
    title: 'Everything ShuleSoft Offers: The Ultimate Guide to Modern School Management',
    excerpt: 'Explore the full power of ShuleSoft. From M-Pesa automation to CBC grading and smart timetables, see how we transform schools.',
    content: `
      <h2>Welcome to the ShuleSoft Ecosystem</h2>
      <p>ShuleSoft is more than just a management tool; it is a comprehensive growth engine for your institution. We have spent years refining our platform to handle the unique challenges of African schools. Below is a detailed breakdown of everything we offer.</p>
      
      <h3>1. Financial Automation & M-Pesa Integration</h3>
      <p>Stop tracing bank slips and manual receipts. Our system integrates directly with M-Pesa to provide zero-effort reconciliation.</p>
      <ul>
        <li><strong>Auto-Reconciliation</strong>: Payments made via M-Pesa are instantly matched to the student's admission number and reflected on their balance.</li>
        <li><strong>Tiered Fee Structures</strong>: Easily manage different rates for Day and Boarding students within the same class.</li>
        <li><strong>Smart Invoicing</strong>: Generate and send itemized invoices and receipts automatically via SMS.</li>
      </ul>

      <h3>2. Advanced Academic & CBC Grading</h3>
      <p>Whether you follow the CBC or the traditional 8-4-4 curriculum, ShuleSoft handles the complex math of grading and ranking.</p>
      <ul>
        <li><strong>CBC Assessment</strong>: Track Core Competencies and Values for Early Years, Primary, and Junior Secondary.</li>
        <li><strong>Automatic Ranking</strong>: Instantly rank students by subject or overall performance across multiple streams.</li>
        <li><strong>Professional Report Cards</strong>: Generate beautiful, printable report cards with teacher remarks and principal signatures in one click.</li>
      </ul>

      <h3>3. Smart Timetabling & Operations</h3>
      <p>Optimize your school's daily schedule with our intelligent conflict-detection engine.</p>
      <ul>
        <li><strong>Timetable Builder</strong>: Create custom schedules for every class and stream. The system prevents room and teacher double-bookings.</li>
        <li><strong>Leave & Cover Management</strong>: Mark staff as "On Leave" and the system will automatically flag lessons needing cover, suggesting available teachers.</li>
      </ul>

      <h3>4. Security & Real-Time Sync</h3>
      <p>Your data is your most valuable asset. We protect it with banking-grade security.</p>
      <ul>
        <li><strong>Real-Time Updates</strong>: All staff see the same data instantly. No more "stale" spreadsheets.</li>
        <li><strong>Selective Access</strong>: Role-based permissions ensure that teachers only see marks, while finance only sees fees.</li>
      </ul>

      <p><em>Ready to transform your school? Join 500+ institutions already growing with ShuleSoft.</em></p>
    `,
    category: 'Feature Deep-Dives',
    author: 'ShuleSoft Team',
    date: new Date().toISOString(),
    image: 'https://images.unsplash.com/photo-1546410531-bb4caa1b424d?auto=format&fit=crop&w=1200&q=80',
    readTime: '8 min read'
  }
];

export async function getSaasBlogPosts() {
  const { data, error } = await supabase
    .from('saas_blog')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.warn('saas_blog table may not exist yet, using initial data:', error);
    return INITIAL_BLOG_POSTS;
  }
  
  return data.length > 0 ? data : INITIAL_BLOG_POSTS;
}

export async function saveSaasBlogPost(post) {
  const { error } = await supabase
    .from('saas_blog')
    .upsert({ 
      ...post, 
      id: post.id || `post-${Date.now()}`,
      created_at: post.date || new Date().toISOString()
    });
  
  if (error) throw error;
  return { success: true };
}

// --- PARTNERS & REFERRALS ---

const INITIAL_PARTNERS = [
  {
    id: 'p1',
    name: 'Greenfield Academy',
    location: 'Nairobi, Kenya',
    image: 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&w=800&q=80',
    description: 'A leading primary school using ShuleSoft to automate CBC assessments for 800+ students.',
    rating: 5,
    since: '2023'
  },
  {
    id: 'p2',
    name: 'St. Jude International',
    location: 'Mombasa, Kenya',
    image: 'https://images.unsplash.com/photo-1519750157634-b6d493a0f77c?auto=format&fit=crop&w=800&q=80',
    description: 'Transforming fee collection through M-Pesa automated reconciliation across three campuses.',
    rating: 5,
    since: '2024'
  },
  {
    id: 'p3',
    name: 'Rift Valley Heights',
    location: 'Nakuru, Kenya',
    image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
    description: 'Leveraging smart timetables and leave management to optimize staff scheduling.',
    rating: 4.8,
    since: '2023'
  }
];

export async function getFeaturedPartners() {
  const { data, error } = await supabase
    .from('featured_partners')
    .select('*');
  
  if (error) {
    console.warn('featured_partners table missing, using defaults');
    return INITIAL_PARTNERS;
  }
  return data.length > 0 ? data : INITIAL_PARTNERS;
}

export async function sendSchoolInvite(email, recipientName) {
  // Simulate an invitation log
  await logPlatformActivity('REFERRAL_SENT', `Referral sent to ${recipientName} (${email})`);
  return { success: true, message: 'Invite sent successfully!' };
}

export async function validateParentLogin(schoolSearch, admNo, phone, schoolId = null) {
  const queryParam = schoolId || schoolSearch;

  const { data, error } = await supabase.rpc('validate_parent_portal_login', {
    p_school_search: queryParam,
    p_adm_no: admNo,
    p_phone: phone
  });

  if (error) {
    throw new Error('Database connection error. Please try again.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!data || !data.id) {
    throw new Error('Invalid credentials.');
  }

  const selectedSchoolId = data.school_id;

  const profile = await getSchoolProfileBySchoolId(selectedSchoolId);

  // Subscription Gate
  const isSubActive = await checkIsSubscriptionActive(profile);
  if (!isSubActive) {
    throw new Error('Your institution\'s ShuleSoft subscription has expired. Access to the Parent Portal is restricted.');
  }

  // Feature Gate
  const hasFeature = await checkFeatureAccess('parent_portal', profile);
  if (!hasFeature) {
    throw new Error('The Parent Portal feature is not active for your institution\'s current plan.');
  }

  return {
    id: data.id,
    name: data.name,
    class: data.class,
    stream: data.stream || '',
    subjects: data.subjects || [],
    adm_no: data.adm_no,
    school_id: data.school_id,
    residence_type: data.residence_type,
    parent_phone: data.parent_phone || ''
  };
}

export async function getTeachersBySchool(schoolId) {
  const { data, error } = await supabase
    .from('teachers')
    .select('id, name, email, phone, subjects, school_id')
    .eq('school_id', schoolId);
  if (error) throw error;
  return data || [];
}


export async function addTeacher(teacher) {
  // Check seat limit using the proper getPlanLimits function
  const profile = await getSchoolProfile();
  const currentTeachers = await getTeachers();
  const plan = profile.subscriptionPlan || 'Sandbox';
  const planLimits = await getPlanLimits(plan);
  const limit = planLimits.admins || 50; // admins field = staff seat limit

  if (currentTeachers.length >= limit) {
    throw new Error(`Staff seat limit reached for ${plan} plan (${limit} staff max). Please upgrade your subscription.`);
  }

  const { data, error } = await supabase
    .from('teachers')
    .insert({ 
      school_id: _currentSchoolId, 
      name: teacher.name, 
      email: teacher.email || null,
      phone: teacher.phone || '', 
      subjects: teacher.subjects || [],
      status: teacher.status || 'Active', 
      tsc_number: teacher.tsc_number || null,
      staff_code: teacher.staff_code || null,
      pin: teacher.pin || '1234'
    })
    .select()
    .single();
    
  if (error) throw error;
  
  // Increment staff_count in profile
  const { data: pData } = await supabase.from('school_profiles').select('staff_count').eq('school_id', _currentSchoolId).single();
  await supabase.from('school_profiles').update({ staff_count: (pData?.staff_count || 0) + 1 }).eq('school_id', _currentSchoolId);

  await logPlatformActivity('TEACHER_ADD', `Added new teacher: ${teacher.name}`);
  
  // Sync to local DB immediately for UI responsiveness
  try { await db.teachers.put(data); } catch(e) {}
  
  return data;
}

export async function updateTeacher(id, updates) {
  // Build a partial update payload — only include fields that are provided
  const payload = {};
  if (updates.name !== undefined) payload.name = sanitizeName(updates.name);
  if (updates.email !== undefined) payload.email = sanitizeString(updates.email);
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.subjects !== undefined) payload.subjects = updates.subjects;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.on_leave !== undefined) payload.on_leave = updates.on_leave;
  if (updates.tsc_number !== undefined) payload.tsc_number = sanitizeString(updates.tsc_number || null);
  if (updates.staff_code !== undefined) payload.staff_code = sanitizeString(updates.staff_code || null);
  if (updates.pin !== undefined) payload.pin = updates.pin;

  const { data, error } = await supabase
    .from('teachers')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    // Graceful handling for missing PIN column during transition
    if (error.message?.includes('pin') && payload.pin) {
       const safePayload = { ...payload };
       delete safePayload.pin;
       if (Object.keys(safePayload).length > 0) {
         const { data: retryData, error: retryErr } = await supabase.from('teachers').update(safePayload).eq('id', id).select().single();
         if (retryErr) throw retryErr;
         try { await db.teachers.put(retryData); } catch(e) {}
         return retryData;
       }
       return { success: true };
    }
    throw error;
  }
  try { await db.teachers.put(data); } catch(e) {}
  return data;
}

export async function deleteTeacher(id) {
  const { data: teacher } = await supabase.from('teachers').select('school_id').eq('id', id).single();
  const schoolId = teacher?.school_id || _currentSchoolId;

  const { error } = await supabase.from('teachers').delete().eq('id', id);
  if (error) throw error;
  try { await db.teachers.delete(id); } catch(e) {}

  // Decrement staff_count in profile
  if (schoolId) {
    const { data: pData } = await supabase.from('school_profiles').select('staff_count').eq('school_id', schoolId).single();
    if (pData && pData.staff_count > 0) {
      await supabase.from('school_profiles').update({ staff_count: pData.staff_count - 1 }).eq('school_id', schoolId);
    }
  }
  await logPlatformActivity('TEACHER_DELETE', `Deleted teacher: ${id}`);
}

export async function isStaffCodeAvailable(code, excludeId = null) {
  if (!code || !_currentSchoolId) return true;
  const { data, error } = await supabase
    .from('teachers')
    .select('id')
    .eq('school_id', _currentSchoolId)
    .eq('staff_code', code)
    .eq('status', 'Active');
  
  if (error) return true;
  if (!data || data.length === 0) return true;
  if (excludeId && data.length === 1 && data[0].id === excludeId) return true;
  return false;
}

// ============= SUBJECT ASSIGNMENTS =============
export async function getSubjectAssignments() {
  if (!_currentSchoolId || !_currentPeriodId) return {};
  const { data, error } = await supabase
    .from('subject_assignments')
    .select('id, class_grade, stream, subject, teacher_id, period_id, school_id')
    .eq('school_id', _currentSchoolId)
    .eq('period_id', _currentPeriodId);
  if (error) throw error;
  // Convert to nested structure: { classGrade: { stream: { subject: teacherId } } }
  const assignments = {};
  (data || []).forEach(row => {
    if (!assignments[row.class_grade]) assignments[row.class_grade] = {};
    if (!assignments[row.class_grade][row.stream]) assignments[row.class_grade][row.stream] = {};
    assignments[row.class_grade][row.stream][row.subject] = row.teacher_id;
  });
  return assignments;
}

export async function setAssignment(classGrade, stream, subject, teacherId) {
  // First remove any existing assignment
  const { error: delError } = await supabase
    .from('subject_assignments')
    .delete()
    .eq('school_id', _currentSchoolId)
    .eq('period_id', _currentPeriodId)
    .eq('class_grade', classGrade)
    .eq('stream', stream)
    .eq('subject', subject);
  
  if (delError) throw delError;

  if (teacherId) {
    const { error: insError } = await supabase
      .from('subject_assignments')
      .insert({
        school_id: _currentSchoolId,
        class_grade: classGrade,
        stream,
        subject,
        teacher_id: teacherId,
        period_id: _currentPeriodId
      });
    if (insError) throw insError;
  }
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

// ============= TEACHER PERFORMANCE =============
export async function getTeacherPerformance(examType = _currentExamType) {
  const marks = await getMarks(examType);
  const students = await getStudents();
  const assignments = await getSubjectAssignments();
  const teachers = await getTeachers();
  const profile = await getSchoolProfile();
  const performance = {};

  for (const [levelName, levelData] of Object.entries(CBC_STRUCTURE)) {
    performance[levelName] = {};
    const firstGrade = levelData.grades[0];
    const subjects = getSubjectsForGrade(firstGrade, profile);

    subjects.forEach(sub => {
      const classPerf = {};
      levelData.grades.forEach(cls => {
        const classStudents = students.filter(s => s.class === cls);
        const streams = profile.streamsPerClass?.[cls] || ['General'];

        streams.forEach(stream => {
          const streamStudents = classStudents.filter(s => (s.stream || 'General') === stream);
          const subMarks = streamStudents.map(s => (marks[s.id] || {})[sub] || 0).filter(m => m > 0);

          let teacherId = null;
          if (assignments[cls] && assignments[cls][stream]) {
            teacherId = assignments[cls][stream][sub];
          }
          const teacher = teachers.find(t => t.id === teacherId);

          if (subMarks.length > 0) {
            const avg = subMarks.reduce((a, b) => a + b, 0) / subMarks.length;
            const above70 = subMarks.filter(m => m >= 70).length;
            const key = streams.length > 1 && stream !== 'General' ? `${cls} (${stream})` : cls;
            classPerf[key] = {
              average: Number(avg.toFixed(1)),
              totalStudents: subMarks.length,
              above70,
              passRate: Number(((above70 / subMarks.length) * 100).toFixed(1)),
              teacherName: teacher ? teacher.name : 'Unassigned',
              teacherId: teacherId || null,
            };
          }
        });
      });
      performance[levelName][sub] = classPerf;
    });
  }
  return performance;
}

// ============= TEACHER WORKLOAD =============
export async function getTeacherWorkload() {
  const teachers = await getTeachers();
  const assignments = await getSubjectAssignments();
  const workload = {};

  teachers.forEach(t => {
    workload[t.id] = { teacher: t, subjects: new Set(), classes: new Set(), assignments: [] };
  });

  for (const [cls, classData] of Object.entries(assignments)) {
    for (const [key, val] of Object.entries(classData)) {
      if (typeof val === 'string') {
        if (workload[val]) {
          workload[val].subjects.add(key);
          workload[val].classes.add(cls);
          workload[val].assignments.push({ class: cls, stream: 'General', subject: key });
        }
      } else {
        for (const [sub, teacherId] of Object.entries(val)) {
          if (workload[teacherId]) {
            workload[teacherId].subjects.add(sub);
            workload[teacherId].classes.add(`${cls} (${key})`);
            workload[teacherId].assignments.push({ class: cls, stream: key, subject: sub });
          }
        }
      }
    }
  }

  return Object.values(workload).map(w => ({
    ...w.teacher,
    subjectCount: w.subjects.size,
    classCount: w.classes.size,
    subjectsList: [...w.subjects],
    classesList: [...w.classes],
    assignments: w.assignments,
  }));
}

// ============= INIT (no-op for Supabase — DB is managed externally) =============
export function initStore() {
  // No-op: Supabase DB is initialized via migration.sql
}

// ============= RESET =============
export async function resetAllData() {
  if (!_currentSchoolId) return;
  // Delete all data for this school
  await supabase.from('subject_assignments').delete().eq('school_id', _currentSchoolId);
  await supabase.from('core_competencies').delete().eq('school_id', _currentSchoolId);
  await supabase.from('cbc_assessments').delete().eq('school_id', _currentSchoolId);
  await supabase.from('attendance').delete().eq('school_id', _currentSchoolId);
  await supabase.from('marks').delete().eq('school_id', _currentSchoolId);
  // Fee payments are cascade-deleted when fees are deleted
  await supabase.from('fees').delete().eq('school_id', _currentSchoolId);
  await supabase.from('students').delete().eq('school_id', _currentSchoolId);
  await supabase.from('teachers').delete().eq('school_id', _currentSchoolId);
}

// ============= DATA EXPORT =============
export async function exportData() {
  const backup = {
    students: await getStudents(),
    teachers: await getTeachers(),
    marks: await getMarks(),
    fees: await getFees(),
    attendance: await getAttendance(),
    cbc: await getCBC(),
    coreCompetencies: await getCoreCompetencies(),
    schoolProfile: await getSchoolProfile(),
    subjectAssignments: await getSubjectAssignments(),
    exportDate: new Date().toISOString(),
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
  const link = document.createElement('a');
  link.setAttribute("href", dataStr);
  link.setAttribute("download", `shulesoft_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// Placeholder: import is complex with UUIDs, leave for later
export async function importData(jsonDataStr) {
  throw new Error('Import is not yet supported on the cloud version. Please contact support.');
}

// ============= CONVENIENCE: Current School setter for backward compat =============
export function setCurrentSchool(schoolId) {
  _currentSchoolId = schoolId;
  window.dispatchEvent(new Event('schoolChanged'));
}

export function getCurrentSchool() {
  return _currentSchoolId;
}

/**
 * Check if a user is a platform admin (Super Admin)
 */
export async function checkIsPlatformAdmin(email) {
  if (!email) return false;
  try {
    const ROOT_ADMINS = ['admin@shulesoft.com', 'shulesoft8@gmail.com'];
    if (ROOT_ADMINS.includes(email)) return true;

    const { data, error } = await supabase
      .from('platform_admins')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      console.warn('Error checking platform admin status:', error);
      return false;
    }
    return !!data;
  } catch (err) {
    console.error('Failed to check platform admin status:', err);
    return false;
  }
}

// ============= PLATFORM MANAGEMENT (SUPER ADMIN) =============

/**
 * Log a global platform event
 */
export async function logPlatformActivity(type, description, schoolId = null) {
  try {
    const { error } = await supabase
      .from('platform_activity_logs')
      .insert({
        type,
        description,
        school_id: schoolId || _currentSchoolId,
        actor_email: _currentAuthUser?.email
      });
    if (error) console.error('Failed to log platform activity:', error);
  } catch (err) {
    console.error('Activity log error:', err);
  }
}

/**
 * Fetch global activity logs (Super Admin only)
 */
export async function getPlatformActivities(limit = 50) {
  const { data, error } = await supabase
    .from('platform_activity_logs')
    .select('id, type, description, actor_email, created_at, schools(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

/**
 * Get platform settings with robust defaults
 */
export async function getPlatformSettings() {
  if (_settingsCache) return _settingsCache;
  if (_settingsPromise) return _settingsPromise;

  _settingsPromise = (async () => {
    try {
      const { data, error } = await supabase
      .from('platform_settings')
      .select('key, value, updated_at');
      
      if (error) throw error;

      const settings = data.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});

      const result = {
        billing: settings.billing || { 
          mpesa_number: "+254712260057", 
          mpesa_name: "Peter Kaulani",
          instructions: "Send money to +254712260057 (Peter Kaulani)", 
          term_price: 5000, 
          trial_days: 30,
          expiry_date: null
        },
        support: settings.support || { 
          email: "shulesoft8@gmail.com", 
          phone: "+254712260057" 
        },
        pricing: (settings.pricing && Object.keys(settings.pricing).length > 0) ? settings.pricing : {
          "Sandbox":      { "price": 0,      "active": true, "limit": 10,  "admins": 1,  "features": ["Student Management", "Feature Exploration"], "modules": ["students", "dashboard"] },
          "Starter Plan": { "price": 4000,  "active": true, "limit": 150,  "admins": 5,  "features": ["Student Management", "Attendance Tracking", "CBC Grading (PP1–Grade 6)", "M-PESA Fee Tracking", "Basic Report Cards"], "modules": ["students", "attendance", "grading", "fees"] },
          "Growth Plan":  { "price": 10000, "active": true, "limit": 400,  "admins": 10, "features": ["Everything in Starter", "Timetable Builder", "Fee Structure Builder", "NEMIS Data Export", "CBC & 8-4-4 Support", "SMS Notifications"], "modules": ["students", "attendance", "grading", "fees", "timetable", "nemis", "sms"] },
          "Pro Plan":     { "price": 20000, "active": true, "limit": 800,  "admins": 20, "features": ["Everything in Growth", "Multi-Campus Support", "Parent Portal", "WhatsApp Integration", "Custom Branding", "Exam Scheduling"], "modules": ["students", "attendance", "grading", "fees", "timetable", "nemis", "sms", "lms", "parent_portal", "custom_brand"] },
          "Enterprise":   { "price": 35000, "active": true, "limit": 100000, "admins": 100, "features": ["Everything Pro", "Dedicated Account Manager", "Custom Features", "Unlimited Staff", "Priority 24/7 Support"] }
        },
        platform: settings.platform || {
          status_message: "",
          maintenance: false
        }
      };
      
      console.log('Final Platform Settings Loaded:', result);
      _settingsCache = result;
      return result;
    } catch (err) {
      console.warn("platform_settings fetch failed, using fallback defaults", err);
      return {
        billing: { instructions: 'Pay via Business Till 908070 (ShuleSoft LTD)', term_price: 8400, trial_days: 30 },
        support: { email: "support@shulesoft.com", phone: "+254 700 000000" },
        pricing: { 
          "Sandbox":      { "price": 0,      "active": true, "limit": 10,   "admins": 1,  "features": ["Student Management", "Feature Exploration"], "modules": ["students", "dashboard"] },
          "Starter Plan": { "price": 4000,  "active": true, "limit": 150,  "admins": 5,  "features": ["Student Management", "Attendance Tracking", "CBC Grading (PP1–Grade 6)", "M-PESA Fee Tracking", "Basic Report Cards"], "modules": ["students", "attendance", "grading", "fees"] },
          "Growth Plan":  { "price": 10000, "active": true, "limit": 400,  "admins": 10, "features": ["Everything in Starter", "Timetable Builder", "Fee Structure Builder", "NEMIS Data Export", "CBC & 8-4-4 Support", "SMS Notifications"], "modules": ["students", "attendance", "grading", "fees", "timetable", "nemis", "sms"] },
          "Pro Plan":     { "price": 20000, "active": true, "limit": 800,  "admins": 20, "features": ["Everything in Growth", "Multi-Campus Support", "Parent Portal", "WhatsApp Integration", "Custom Branding", "Exam Scheduling"], "modules": ["students", "attendance", "grading", "fees", "timetable", "nemis", "sms", "lms", "parent_portal", "custom_brand"] },
          "Enterprise":   { "price": 35000, "active": true, "limit": 100000, "admins": 100, "features": ["Everything Pro", "Dedicated Account Manager", "Custom Features", "Unlimited Staff", "Priority 24/7 Support"] }
        },
        platform: { status_message: "", maintenance: false }
      };
    } finally {
      _settingsPromise = null;
    }
  })();

  return _settingsPromise;
}

/**
 * Helper to get price for a specific plan from settings
 */
export async function getPlanPrice(planName) {
  const settings = await getPlatformSettings();
  const lowerName = planName?.toLowerCase();
  
  // Try exact match or case-insensitive match
  let plan = settings.pricing[planName];
  if (!plan) {
    const key = Object.keys(settings.pricing).find(k => k.toLowerCase() === lowerName);
    plan = settings.pricing[key];
  }
  
  // Fallback to Starter Plan or some default
  plan = plan || settings.pricing["Starter Plan"] || settings.pricing["Starter"] || Object.values(settings.pricing)[0];
  return plan?.price || 4999;
}

/**
 * Get the global term expiry date from platform settings
 */
export async function getGlobalTermExpiry() {
  const settings = await getPlatformSettings();
  return settings?.billing?.expiry_date || settings?.billing?.term_expiry || null;
}

/**
 * Update platform setting
 */
export async function updatePlatformSetting(key, value) {
  const { error } = await supabase
    .from('platform_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
  _settingsCache = null; 
  _settingsPromise = null;
  await logPlatformActivity('SETTING_UPDATE', `Updated platform setting: ${key}`);
}

/**
 * Delete a school permanently
 */
export async function deleteSchool(schoolId) {
  // Deep delete: Clear all associated data for this school
  const tables = [
    'school_profiles',
    'users',
    'academic_periods',
    'students',
    'fees',
    'marks',
    'attendance',
    'timetable_slots',
    'timetable_configs',
    'lesson_requirements',
    'subject_assignments',
    'sms_messages',
    'mpesa_callbacks',
    'lms_assignments',
    'fee_structure',
    'payments',
    'teachers',
    'library_books',
    'library_borrows',
    'activity_logs',
    'platform_activity',
    'cbc_assessments',
    'core_competencies',
    'fee_payments',
    'notifications'
  ];

  for (const table of tables) {
    try {
      await supabase.from(table).delete().eq('school_id', schoolId);
    } catch (e) {
      // Some tables might not exist or might not have a school_id column
      console.warn(`Clean-up: Failed to delete from ${table} for school ${schoolId}`, e.message);
    }
  }

  // Finally delete the school record itself
  const { error } = await supabase
    .from('schools')
    .delete()
    .eq('id', schoolId);
    
  if (error) throw error;
  await logPlatformActivity('SCHOOL_DELETE', `Terminated school workspace: ${schoolId}`);
}

/**
 * CRITICAL: DESTRUCTIVE CLEANUP
 * Deletes all school workspaces and associated data from the system,
 * PROTECTING only the ShuleSoft HQ / Super Admin school.
 */
export async function wipeAllNonAdminSchools() {
  const PLATFORM_ADMINS = ['admin@shulesoft.com', 'shulesoft8@gmail.com'];
  
  // 1. Fetch all schools
  const { data: schools, error } = await supabase.from('schools').select('id, name, owner_id');
  if (error) throw error;

  console.log(`Starting cleanup of ${schools.length} schools...`);
  let deletedCount = 0;

  for (const school of schools) {
    // PROTECT the platform owner/HQ workspace or schools owned by core admins
    const isSuperAdminSchool = school.name?.toLowerCase().includes('shulesoft hq');
    const isOwnedByAdmin = PLATFORM_ADMINS.includes(school.owner_id);

    if (isSuperAdminSchool || isOwnedByAdmin) {
      console.log(`>>> PROTECTING: ${school.name} (${school.id})`);
      continue;
    }

    try {
      console.log(`Deleting: ${school.name} (${school.id})...`);
      await deleteSchool(school.id);
      deletedCount++;
    } catch (err) {
      console.error(`Failed to delete school ${school.id}:`, err.message);
    }
  }

  // 2. Also clear global activity logs that aren't linked to a specific school (optional, but good for reset)
  // await supabase.from('platform_activity').delete().neq('user_email', 'admin@shulesoft.com');

  return { success: true, totalDeleted: deletedCount };
}

/**
 * Get all schools with their profiles
 */
/**
 * Get all schools with their profiles and real usage counts
 */
export async function getAllSchools() {
  // 1. Fetch schools and profiles
  const { data: schools, error: sErr } = await supabase
    .from('schools')
    .select('id, name, email, plan, owner_id, phone, location, created_at, school_profiles(*)');
  
  if (sErr) {
    console.error('Error fetching all schools:', sErr);
    return [];
  }

  // 2. Fetch all student counts
  const { data: students, error: stErr } = await supabase
    .from('students')
    .select('school_id');
  
  // 3. Fetch all staff counts
  const { data: staff, error: sfErr } = await supabase
    .from('users')
    .select('school_id')
    .neq('role', 'Super Admin'); // Exclude system wide admins

  const studentCounts = (students || []).reduce((acc, curr) => {
    acc[curr.school_id] = (acc[curr.school_id] || 0) + 1;
    return acc;
  }, {});

  const staffCounts = (staff || []).reduce((acc, curr) => {
    acc[curr.school_id] = (acc[curr.school_id] || 0) + 1;
    return acc;
  }, {});

  return (schools || []).map(s => ({
    ...s,
    _studentCount: studentCounts[s.id] || 0,
    _staffCount: staffCounts[s.id] || 0
  }));
}

/**
 * Deactivate a school — sets status to 'Deactivated' on both schools and school_profiles
 */
export async function deactivateSchool(schoolId) {
  const { error: e2 } = await supabase.from('school_profiles').update({ subscription_status: 'Deactivated' }).eq('school_id', schoolId);
  if (e2) throw e2;
  await logPlatformActivity('DEACTIVATION', `School ${schoolId} deactivated by admin`, schoolId);
}

/**
 * Restore / Activate a school — sets status to 'Active' and extends expiry
 */
export async function restoreSchool(schoolId, monthsToAdd = 4) {
  // 1. Calculate new expiry
  const { data: profileData, error: getProfileError } = await supabase
    .from('school_profiles')
    .select('subscription_expiry')
    .eq('school_id', schoolId)
    .single();

  if (getProfileError) throw getProfileError; // Throw if fetching profile fails

  let expiry = new Date();
  if (profileData && profileData.subscription_expiry) {
    const currentExpiry = new Date(profileData.subscription_expiry);
    if (currentExpiry > expiry) {
      expiry = currentExpiry;
    }
  }
  expiry.setMonth(expiry.getMonth() + monthsToAdd);

  const { error: e2 } = await supabase
    .from('school_profiles')
    .update({ 
      subscription_status: 'Active',
      subscription_expiry: expiry.toISOString()
    })
    .eq('school_id', schoolId);
  if (e2) throw e2;
  await logPlatformActivity('ACTIVATION', `School ${schoolId} activated by admin (+${monthsToAdd} months)`, schoolId);
}

/**
 * Suspend a school
 */
export async function suspendSchool(schoolId) {
  const { error: e2 } = await supabase.from('school_profiles').update({ subscription_status: 'Suspended' }).eq('school_id', schoolId);
  if (e2) throw e2;
  await logPlatformActivity('SUSPENSION', `School ${schoolId} suspended by admin`, schoolId);
}

/**
 * Get platform-wide stats for Super Admin dashboard
 */
export async function getPlatformStats() {
  try {
    // 1. Core Data Queries (Independent)
    const [schoolsRes, profilesRes, paymentsRes, settingsRes] = await Promise.all([
      supabase.from('schools').select('id, created_at, plan'),
      supabase.from('school_profiles').select('school_id, subscription_status, subscription_expiry, created_at'),
      supabase.from('payments').select('amount, status, created_at'),
      getPlatformSettings()
    ]);

    const sData  = schoolsRes.data || [];
    const prData = profilesRes.data || [];
    const pData  = paymentsRes.data || [];
    const cf     = settingsRes || {};

    // 2. Auxiliary Metrics (Graceful Failure)
    let studCount = 0, examCount = 0, portCount = 0, attTotal = 0, attPresent = 0, totalRows = 0;
    try {
      const [sRes, eRes, oRes, aRes, apRes, lmsARes, lmsSRes, actRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('exam_results').select('*', { count: 'exact', head: true }),
        supabase.from('student_portfolios').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('status', 'Present'),
        supabase.from('lms_assignments').select('*', { count: 'exact', head: true }),
        supabase.from('lms_submissions').select('*', { count: 'exact', head: true }),
        supabase.from('platform_activity').select('*', { count: 'exact', head: true })
      ]);
      studCount = sRes.count || 0;
      examCount = eRes.count || 0;
      portCount = oRes.count || 0;
      attTotal = aRes.count || 0;
      attPresent = apRes.count || 0;
      
      // Calculate Platform Health (Row Counts)
      totalRows = (sRes.count || 0) + (eRes.count || 0) + (oRes.count || 0) + (aRes.count || 0) + (lmsARes.count || 0) + (lmsSRes.count || 0) + (actRes.count || 0);
    } catch (e) {
      console.warn('Auxiliary stats fetch failed partially', e);
    }

    const attendanceRate = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;
    const globalExpiryRaw = cf?.billing?.expiry_date || cf?.billing?.term_expiry;
    const globalExpiry    = globalExpiryRaw ? new Date(globalExpiryRaw) : null;
    const now             = new Date();
    const isGloballyExpired = globalExpiry && globalExpiry < now;

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const checkActive = (p) => {
      if (!p) return false;
      // PLATFORM OVERRIDE: ShuleSoft HQ is always active
      if (p.schools?.name?.toLowerCase().includes('shulesoft hq')) return true;

      // 1. Explicit deactivation/suspension wins
      if (p.subscription_status === 'Deactivated' || p.subscription_status === 'Suspended') return false;

      // 2. Individual future expiry wins
      if (p.subscription_expiry && new Date(p.subscription_expiry) > now) return true;

      // 3. Global cutoff for older schools
      if (isGloballyExpired) return false;

      // 4. Status check
      return p.subscription_status === 'Active';
    };

    const activeCount = prData.filter(checkActive).length;
    const suspendedSchools = prData.filter(p => p.subscription_status === 'Suspended' || p.subscription_status === 'Deactivated').length;
    const expiredSchools = prData.filter(p => !checkActive(p) && !['Suspended', 'Deactivated'].includes(p.subscription_status)).length;
    
    const totalSchools = sData.length;
    const deactivatedSchools = suspendedSchools; // Grouped as requested
    
    const totalRev = pData
      .filter(p => p.status === 'Approved')
      .reduce((acc, curr) => acc + Number(curr.amount), 0);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0,0,0,0);
    // New schools this month should be based on the 'schools' table created_at
    const newSchoolsThisMonth = sData.filter(s => new Date(s.created_at) >= thisMonth).length;

    const revenueHistory = [];
    const labels = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      d.setDate(1);
      const monthStart = new Date(d);
      monthStart.setHours(0,0,0,0);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      
      const monthRev = pData
        .filter(p => p.status === 'Approved' && new Date(p.created_at) >= monthStart && new Date(p.created_at) <= monthEnd)
        .reduce((acc, curr) => acc + Number(curr.amount), 0);
      
      revenueHistory.push(monthRev);
      labels.push(d.toLocaleString('default', { month: 'short' }));
    }

    return {
      totalSchools: totalSchools || 0,
      activeSchools: activeCount || 0,
      suspendedSchools: suspendedSchools || 0,
      expiredSchools: expiredSchools || 0,
      deactivatedSchools: deactivatedSchools || 0,
      revenue: totalRev,
      newSchoolsThisMonth,
      pendingPayments: pData.filter(p => p.status === 'Pending').length,
      revenueHistory,
      labels,
      health: activeCount >= expiredSchools ? 'Healthy' : 'Critical',
      studCount: studCount || 0,
      examCount: examCount || 0,
      portCount: portCount || 0,
      attendanceRate: attendanceRate || 0,
      totalRows: totalRows || 0,
      dbCapacity: (totalRows / 500000) * 100 // Estimate relative usage based on ~500k row limit guideline for free tier
    };
  } catch (err) {
    console.error('getPlatformStats error:', err);
    // Return empty stats instead of throwing to keep UI alive
    return {
      totalSchools: 0, activeSchools: 0, suspendedSchools: 0, expiredSchools: 0, deactivatedSchools: 0, revenue: 0, newSchoolsThisMonth: 0,
      pendingPayments: 0, revenueHistory: [0,0,0,0,0,0], labels: ['Jan','Feb','Mar','Apr','May','Jun'], health: 'Unknown'
    };
  }
}

/**
 * Reject a payment
 */
export async function rejectPayment(paymentId, schoolId, reason = 'Verification failed') {
  const { error } = await supabase
    .from('payments')
    .update({ status: 'Rejected', notes: reason })
    .eq('id', paymentId);
  if (error) throw error;

  await supabase
    .from('school_profiles')
    .update({ last_payment_status: 'rejected' })
    .eq('school_id', schoolId);

  await logPlatformActivity('PAYMENT_REJECT', `Rejected payment for ${schoolId}: ${reason}`, schoolId);
}



export async function cancelSubscription() {
  if (!_currentSchoolId) return;
  const { error } = await supabase
    .from('school_profiles')
    .update({ subscription_status: 'Deactivated' })
    .eq('school_id', _currentSchoolId);
  if (error) throw error;
  await logPlatformActivity('SUBSCRIPTION_CANCEL', `School canceled subscription: ${_currentSchoolId}`, _currentSchoolId);
}

export async function updateSchoolPlan(schoolId, plan) {
  // 1. Update Profile (Detailed data - used by School Portal)
  const { error: pError } = await supabase
    .from('school_profiles')
    .update({ subscription_plan: plan })
    .eq('school_id', schoolId);
  if (pError) throw pError;

  // 2. Update Schools Master (Summarized data - used by Super Admin list)
  const { error: sError } = await supabase
    .from('schools')
    .update({ plan: plan })
    .eq('id', schoolId);
  // We log warning but don't strictly fail if the master sync fails, though it should succeed
  if (sError) console.warn('Sync to schools table failed:', sError);

  await logPlatformActivity('PLAN_CHANGE', `Admin updated school plan to ${plan}`, schoolId);
}


/**
 * Reset a user's password (Stub - usually requires a SECURE DEFINER RPC or Admin Auth API)
 */
export async function resetUserPassword(authUserId, newPassword = 'password123') {
  // In a real app, you'd use a server-side route or a SECURITY DEFINER RPC.
  // For this demo/MVP, we'll try to use the RPC if it exists, or just log it.
  const { error } = await supabase.rpc('platform_reset_password', { 
    target_user_id: authUserId, 
    new_password: newPassword 
  });
  if (error) {
    console.error("Password reset RPC failed. Ensure platform_reset_password RPC exists.", error);
    throw new Error("Password reset failed. Administrative privileges required.");
  }
  await logPlatformActivity('PASSWORD_RESET', `Reset password for user: ${authUserId}`);
}

/**
 * Manually extend a subscription (Super Admin override)
 */
export async function manualExtendSubscription(schoolId, daysToAdd) {
  const { data: profile, error: getErr } = await supabase
    .from('school_profiles')
    .select('subscription_expiry')
    .eq('school_id', schoolId)
    .single();
  
  if (getErr) throw getErr;

  let baseDate = new Date();
  const currentExpiry = new Date(profile.subscription_expiry);
  if (currentExpiry > baseDate) {
    baseDate = currentExpiry; // If still active, add to the end
  }

  const newExpiry = new Date(baseDate);
  newExpiry.setDate(newExpiry.getDate() + daysToAdd);

  const { error } = await supabase
    .from('school_profiles')
    .update({ 
      subscription_status: 'Active',
      subscription_expiry: newExpiry.toISOString(),
      last_payment_status: 'manual_extension'
    })
    .eq('school_id', schoolId);
  
  if (error) throw error;
  
  await logPlatformActivity('SUBSCRIPTION_EXTEND', `Extended school access by ${daysToAdd} days`, schoolId);
}

/**
 * Real-time subscription helper
 */
export function subscribeToChanges(table, onUpdate) {
  if (!_currentSchoolId) return () => {};
  
  const channel = supabase
    .channel(`${table}_changes_${Math.random().toString(36).substring(7)}`)
    .on(
      'postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: table,
        filter: `school_id=eq.${_currentSchoolId}` 
      }, 
      (payload) => {
        onUpdate(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Global platform subscription for Super Admins.
 * Covers ALL key tables so the SuperAdmin dashboard updates in real-time.
 */
export function subscribeToPlatformChanges(onUpdate) {
  const channel = supabase
    .channel('platform_global_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'schools' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'school_profiles' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_activity' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fees' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mpesa_callbacks' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'marks' }, onUpdate)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * School-portal subscription for the App shell.
 * Listens to platform_settings and the school's own profile so that
 * plan changes, feature toggles, and profile updates by the SuperAdmin
 * propagate instantly without a page refresh.
 */
export function subscribeToSchoolChanges(onSettingsChange, onProfileChange) {
  if (!_currentSchoolId) return () => {};

  const channel = supabase
    .channel(`school_shell_${_currentSchoolId}`)
    // Platform-wide settings (pricing, plans, features)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, () => {
      onSettingsChange();
    })
    // This school's profile (plan, name, status)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'school_profiles',
      filter: `school_id=eq.${_currentSchoolId}`
    }, () => {
      onProfileChange();
    })
    // Students added/removed (for sidebar counts, etc.)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'students',
      filter: `school_id=eq.${_currentSchoolId}`
    }, () => {
      window.dispatchEvent(new Event('studentsSynced'));
    })
    // Payments / M-Pesa callbacks
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


// ============= TIMETABLE =============

export async function getTimetableConfig(schoolId, periodId) {
  if (!_currentAuthUser && _currentSchoolId) {
    const { data, error } = await supabase.rpc('portal_get_timetable_config', { 
      p_school_id: schoolId, 
      p_period_id: periodId 
    });
    if (error) throw error;
    return data || [];
  }

  const { data, error } = await supabase
    .from('timetable_configs')
    .select('*')
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .order('slot_index', { ascending: true });
  if (error) throw error;
  return data || [];
}


export async function saveTimetableConfig(schoolId, periodId, slots) {
  const { error: delErr } = await supabase
    .from('timetable_configs')
    .delete()
    .eq('school_id', schoolId)
    .eq('period_id', periodId);
  if (delErr) throw delErr;

  if (!slots || slots.length === 0) return;

  const rows = slots.map((s, i) => ({
    school_id: schoolId,
    period_id: periodId,
    slot_index: i,
    label: s.label,
    start_time: s.start_time,
    end_time: s.end_time,
    is_break: s.is_break || false
  }));

  const { error } = await supabase.from('timetable_configs').insert(rows);
  if (error) throw error;
}


export async function getTimetableSlots(schoolId, periodId, classGrade, stream = null) {
  let query = supabase
    .from('timetable_slots')
    .select('*, teachers(id, name, staff_code)')
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .eq('class_grade', classGrade);
  
  if (stream) query = query.eq('stream', stream);
  else query = query.eq('stream', '');


  const { data, error } = await query.order('slot_index', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getAllTimetableSlots(schoolId, periodId) {
  const { data, error } = await supabase
    .from('timetable_slots')
    .select('*, teachers(id, name, staff_code)')
    .eq('school_id', schoolId)
    .eq('period_id', periodId);
  if (error) throw error;
  return data || [];
}

export async function getTeacherTimetable(schoolId, periodId, teacherId) {
  // Use robust RPC for both Admin and Portal to ensure data sync
  const { data, error } = await supabase.rpc('portal_get_teacher_timetable', { 
    p_school_id: schoolId, 
    p_period_id: periodId,
    p_teacher_id: teacherId
  });
  if (error) throw error;
  return data || [];
}

export async function saveTimetableSlot(schoolId, periodId, slot) {
  const { error } = await supabase
    .from('timetable_slots')
    .upsert({
      school_id: schoolId,
      period_id: periodId,
      class_grade: slot.class_grade,
      stream: slot.stream || '',
      day_of_week: slot.day_of_week,
      slot_index: slot.slot_index,
      subject: slot.subject,
      teacher_id: slot.teacher_id || null,
      room: slot.room || null,
      color: slot.color || null,
      is_double_first: slot.is_double_first || false,
      is_double_second: slot.is_double_second || false,
      start_time: slot.start_time || null,
      end_time: slot.end_time || null
    }, { onConflict: 'school_id,period_id,class_grade,stream,day_of_week,slot_index' });
  if (error) throw error;
  return true;
}


export async function clearTimetableSlot(schoolId, periodId, classGrade, stream, day, slotIndex) {
  let query = supabase
    .from('timetable_slots')
    .delete()
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .eq('class_grade', classGrade)
    .eq('day_of_week', day)
    .eq('slot_index', slotIndex);
  
  if (stream) query = query.eq('stream', stream);
  else query = query.eq('stream', '');

  const { error } = await query;
  if (error) throw error;
  return true;
}

// ─── Room Management ────────────────────────────────────────────────────────

export async function getTimetableRooms(schoolId) {
  const { data, error } = await supabase
    .from('timetable_rooms')
    .select('*')
    .eq('school_id', schoolId)
    .order('name', { ascending: true });
  if (error) {
    // Graceful fallback if table doesn't exist yet - some environments might use local storage for rooms
    console.warn("timetable_rooms table fetch error:", error);
    return [];
  }
  return data || [];
}

export async function saveTimetableRoom(schoolId, room) {
  const payload = {
    school_id: schoolId,
    name: room.name,
    building: room.building || null,
    updated_at: new Date().toISOString()
  };

  if (room.id) {
    const { data, error } = await supabase
      .from('timetable_rooms')
      .update(payload)
      .eq('id', room.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('timetable_rooms')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function deleteTimetableRoom(id) {
  const { error } = await supabase
    .from('timetable_rooms')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

export async function clearAndSaveTimetable(schoolId, periodId, slots, classGrades) {
  const { error: delErr } = await supabase
    .from('timetable_slots')
    .delete()
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .in('class_grade', classGrades);
  if (delErr) throw delErr;

  if (!slots || slots.length === 0) return;
  const rows = slots.map(s => ({
    school_id: schoolId,
    period_id: periodId,
    class_grade: s.class_grade,
    stream: s.stream || null,
    day_of_week: s.day_of_week,
    slot_index: s.slot_index,
    subject: s.subject,
    teacher_id: s.teacher_id || null,
    room: s.room || null,
    color: s.color || null,
    is_double_first: s.is_double_first || false,
    is_double_second: s.is_double_second || false,
    date: s.date || null,
    start_time: s.start_time || null,
    end_time: s.end_time || null
  }));

  const CHUNK_SIZE = 100;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from('timetable_slots').insert(chunk);
    if (error) throw error;
  }
}

/**
 * [NEW] Clear ALL slots for a period
 */
export async function clearAllTimetableSlots(schoolId, periodId) {
  mutationGuard('clearAllTimetableSlots');
  const { error } = await supabase
    .from('timetable_slots')
    .delete()
    .eq('school_id', schoolId)
    .eq('period_id', periodId);
  if (error) throw error;
  return true;
}

/**
 * [NEW] Duplicate Timetable structure from one term to another
 */
export async function duplicateTimetable(schoolId, fromPeriodId, toPeriodId) {
  mutationGuard('duplicateTimetable');
  if (fromPeriodId === toPeriodId) throw new Error("Source and target periods cannot be the same.");

  const { data: sourceSlots, error: fetchErr } = await supabase
    .from('timetable_slots')
    .select('*')
    .eq('school_id', schoolId)
    .eq('period_id', fromPeriodId);
  
  if (fetchErr) throw fetchErr;
  if (!sourceSlots || sourceSlots.length === 0) throw new Error("No timetable slots found in the source period.");

  // Clear target before duplication to avoid conflicts
  await clearAllTimetableSlots(schoolId, toPeriodId);

  const newSlots = sourceSlots.map(s => {
    const { id, created_at, ...rest } = s; // Strip unique fields
    return { ...rest, period_id: toPeriodId };
  });

  const CHUNK_SIZE = 100;
  for (let i = 0; i < newSlots.length; i += CHUNK_SIZE) {
    const chunk = newSlots.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from('timetable_slots').insert(chunk);
    if (error) throw error;
  }
  return true;
}

/**
 * [NEW] Get summary workload for a teacher
 */
export async function getTeacherWorkloadSummary(schoolId, periodId, teacherId) {
  if (!_currentAuthUser && _currentSchoolId) {
    const { data, error } = await supabase.rpc('portal_get_teacher_workload', { 
      p_school_id: schoolId, 
      p_period_id: periodId,
      p_teacher_id: teacherId
    });
    if (error) throw error;
    return data || 0;
  }

  const { data, error, count } = await supabase
    .from('timetable_slots')
    .select('id', { count: 'exact' })
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .eq('teacher_id', teacherId);
  
  if (error) throw error;
  return count || 0;
}




/**
 * [NEW] Smart Time-Aware Conflict Detection
 * Checks if a teacher or class is busy during a specific time range.
 * Overlap Logic: (newStart < existingEnd) && (existingStart < newEnd)
 */
export async function checkTimetableConflicts(schoolId, periodId, { day, startTime, endTime, teacherId, classGrade, stream, currentSlotIndex }) {
  if (!startTime || !endTime) return null;

  // 1. Fetch ALL slots for that day and school
  const { data: slots, error } = await supabase
    .from('timetable_slots')
    .select('*, teachers(name)')
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .eq('day_of_week', day);
  
  if (error) throw error;
  if (!slots || slots.length === 0) return null;

  // Function to check if two time strings overlap (ignore seconds)
  const isOverlap = (s1, e1, s2, e2) => (s1.substring(0, 5) < e2.substring(0, 5)) && (s2.substring(0, 5) < e1.substring(0, 5));

  for (const s of slots) {
    // Skip the slot we are currently editing
    if (s.class_grade === classGrade && (s.stream || null) === (stream || null) && s.slot_index === currentSlotIndex) continue;
    
    // Check if times were recorded for the existing slot
    if (!s.start_time || !s.end_time) continue;

    if (isOverlap(startTime, endTime, s.start_time, s.end_time)) {
      // a) Teacher Conflict
      if (teacherId && s.teacher_id === teacherId) {
        return { 
          type: 'teacher', 
          msg: `Teacher double-booked: Already assigned to ${s.subject} in ${s.class_grade} ${s.stream || ''} (${s.start_time}-${s.end_time})`
        };
      }
      // b) Class Conflict (Only if we are scheduling for THIS class)
      if (s.class_grade === classGrade && (s.stream || null) === (stream || null)) {
        return { 
          type: 'class', 
          msg: `Class double-booked: Already has ${s.subject} during this time (${s.start_time}-${s.end_time})`
        };
      }
    }
  }

  return null;
}



export async function getClassSubjectAssignments(schoolId, periodId, classGrade, stream = null) {
  let query = supabase
    .from('subject_assignments')
    .select('*')
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .eq('class_grade', classGrade);
  if (stream) query = query.eq('stream', stream);
  // If no stream is provided, fetch assignments for all streams of the class to ensure competency checks still work
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
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

// ============= FEE STRUCTURE =============


// ============= SUPER ADMIN / PLATFORM =============

export async function getStudentsBySchool(schoolId) {
  const { data, error } = await supabase
    .from('students')
    .select('id, name, adm_no, class_grade, stream, parent_phone, gender, join_date, school_id')
    .eq('school_id', schoolId);
  if (error) throw error;
  return data || [];
}

// Redundant legacy library functions removed

// ============= FEATURE GATING =============

const FEATURE_MAPPING = {
  attendance : ['Attendance Tracking', 'Daily Attendance'],
  grading    : ['CBC Grading', 'CBC Competency', 'Grading & Results', 'KCSE / KCPE Report Cards', 'CBC Report Cards'],
  timetable  : ['Timetable Builder', 'Automated Timetable', 'Scheduler'],
  fees       : ['Student Fee Statements', 'M-PESA Fee Tracking', 'Fee Management', 'Billing', 'Fee Structure Builder'],
  library    : ['Library Management', 'E-Library'],
  nemis      : ['NEMIS Data Export', 'Ministry Export'],
  sms        : ['SMS Notifications', 'Parent SMS Notifications', 'Bulk SMS', 'WhatsApp'],
  lms        : ['E-Learning', 'LMS', 'Homework'],
  mpesa      : ['M-Pesa STK Push', 'M-PESA Paybill'],
  teacher_portal : ['Teacher Portal Access', 'Teacher Mobile Portal'],
  parent_portal  : ['Parent Portal', 'Student Portal'],
  analytics  : ['Smart Analytics', 'Insights'],
  multi_stream : ['Multi-Stream Support'],
  custom_brand : ['Custom Branding'],
  api_access   : ['API Access'],
};

/**
 * Check if a feature is enabled for the current school.
 * Priority:
 *   1. Platform admin override → always true
 *   2. plan.modules[] hard slug check (new authoritative system)
 *   3. Fuzzy FEATURE_MAPPING string match (backward compat for plans without modules[])
 */
/**
 * Check if a feature is enabled for the current school.
 * Consolidates all gating logic into checkFeatureAccess for consistency.
 */
export async function isFeatureEnabled(featureSlug) {
  try {
    const profile = await getSchoolProfile();
    
    // School-level module toggle override
    if (featureSlug === 'attendance' && profile.enabledModules?.attendance === false) {
      return false;
    }
    
    return await checkFeatureAccess(featureSlug, profile);
  } catch (e) {
    console.error("Feature gating error:", e);
    return false;
  }
}

// ============= M-PESA & SMS INTEGRATION =============

/**
 * Queue an SMS for sending. 
 * This inserts into the DB queue for a background worker.
 */
export async function queueSMS(phoneNumber, message, type = 'general') {
  if (!_currentSchoolId) return;
  try {
    const { error } = await supabase
      .from('sms_messages')
      .insert({
        school_id: _currentSchoolId,
        phone_number: phoneNumber,
        message: message,
        type: type,
        status: 'queued'
      });
    if (error) console.error('Failed to queue SMS:', error);
  } catch (err) {
    console.error('SMS Queue Error:', err);
  }
}

/**
 * Process a Daraja API callback.
 * Typically called by an Edge Function or Webhook endpoint.
 */
export async function processMpesaPayment(callbackData) {
  const { 
    SchoolId, 
    Amount, 
    MpesaReceiptNumber, 
    TransactionDate, 
    PhoneNumber, 
    BillRefNumber // This usually contains the Admission No
  } = callbackData;

  // 1. Log the raw callback first
  const { data: log, error: logErr } = await supabase
    .from('mpesa_callbacks')
    .insert({
      school_id: SchoolId,
      amount: Amount,
      mpesa_receipt_number: MpesaReceiptNumber,
      transaction_date: TransactionDate,
      phone_number: PhoneNumber,
      bill_ref_number: BillRefNumber,
      raw_payload: callbackData,
      status: 'pending'
    })
    .select()
    .single();

  if (logErr) throw logErr;

  try {
    // 2. Try to find the student by Admission Number
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('id, name, parent_phone, class')
      .eq('school_id', SchoolId)
      .ilike('adm_no', BillRefNumber)
      .maybeSingle();

    if (!student) {
      // Mark as orphaned for manual reconciliation
      await supabase.from('mpesa_callbacks').update({ status: 'orphaned' }).eq('id', log.id);
      return { status: 'orphaned', message: 'Student not found' };
    }

    // 3. Record the payment using the RPC
    await recordPayment(student.id, Amount, 'M-Pesa', MpesaReceiptNumber);

    // 4. Success - Update callback status
    await supabase.from('mpesa_callbacks').update({ 
      status: 'processed', 
      student_id: student.id 
    }).eq('id', log.id);

    return { status: 'success', student: student.name };
  } catch (err) {
    await supabase.from('mpesa_callbacks').update({ status: 'failed', result_desc: err.message }).eq('id', log.id);
    throw err;
  }
}

export async function getMpesaLogs() {
  if (!_currentSchoolId) return [];
  const { data, error } = await supabase
    .from('mpesa_callbacks')
    .select('*, students(name, class, adm_no)')
    .eq('school_id', _currentSchoolId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getSMSLogs() {
  if (!_currentSchoolId) return [];
  const { data, error } = await supabase
    .from('sms_messages')
    .select('*')
    .eq('school_id', _currentSchoolId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function queueSmsBatch(messages) {
  if (!_currentSchoolId || !messages.length) return;
  const { error } = await supabase
    .from('sms_messages')
    .insert(messages.map(m => ({
      school_id: _currentSchoolId,
      phone_number: m.phone,
      message: m.message,
      type: m.type || 'general',
      status: 'queued'
    })));
  if (error) throw error;
}

/**
 * Validate M-Pesa credentials (Mock/Local validation for now)
 */
export async function testMpesaConnection(config) {
  const key = config.consumer_key?.includes('...********') 
    ? await decrypt(config._encrypted?.consumer_key, _currentSchoolId) 
    : config.consumer_key;
  const secret = config.consumer_secret?.includes('...********')
    ? await decrypt(config._encrypted?.consumer_secret, _currentSchoolId)
    : config.consumer_secret;

  return new Promise((resolve) => {
    setTimeout(() => {
      if (!config.shortcode || !key || !secret) {
        resolve({ success: false, message: 'Missing required configuration fields.' });
      } else if (config.shortcode.length < 5) {
        resolve({ success: false, message: 'Invalid Shortcode format.' });
      } else {
        resolve({ success: true, message: 'Connection to Safaricom Daraja API successful!' });
      }
    }, 1500);
  });
}

/**
 * Validate SMS credentials (Mock/Local validation for now)
 */
export async function testSmsConnection(config) {
  const key = config.api_key?.includes('...********')
    ? await decrypt(config._encrypted?.api_key, _currentSchoolId)
    : config.api_key;

  return new Promise((resolve) => {
    setTimeout(() => {
      if (!key) {
        resolve({ success: false, message: 'API Key is required.' });
      } else if (key.length < 20) {
        resolve({ success: false, message: 'API Key appears to be too short or invalid.' });
      } else {
        resolve({ success: true, message: 'Connection to Africa\'s Talking API successful!' });
      }
    }, 1200);
  });
}

// ============= OFFLINE SYNC MANAGER =============

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
            if (!err1) success = true;
            break;
          }
          case syncTypes.ADD_MARK: {
            const { error: err2 } = await supabase.from('marks').insert([item.payload]);
            if (!err2) success = true;
            break;
          }
          case syncTypes.UPDATE_STUDENT: {
            const { id: studentId, ...updates } = item.payload;
            const { error: err3 } = await supabase.from('students').update(updates).eq('id', studentId);
            if (!err3) success = true;
            break;
          }
          case syncTypes.ADD_ATTENDANCE: {
            const { error: err4 } = await supabase.from('attendance').upsert(item.payload);
            if (!err4) success = true;
            break;
          }
          default:
            success = true;
            break;
        }
        
        if (success) {
          await updateSyncStatus(item.id, 'synced');
        } else {
          await updateSyncStatus(item.id, 'failed');
        }
      } catch (e) {
        console.error("Sync item failed:", e);
      }
    }
  } finally {
    _syncing = false;
    window.dispatchEvent(new Event('syncCompleted'));
  }

  // Also auto-process any pending M-Pesa callbacks
  try { await autoProcessMpesaCallbacks(); } catch (e) { /* silent */ }
}

// ============= M-PESA RECONCILIATION =============

/**
 * Fetch M-Pesa callbacks that are "orphaned" or pending manual action
 */
export async function getOrphanedMpesaCallbacks() {
  if (!_currentSchoolId) return [];
  const { data, error } = await supabase
    .from('mpesa_callbacks')
    .select('*')
    .eq('school_id', _currentSchoolId)
    .in('status', ['pending', 'orphaned', 'failed'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Automatically process pending M-Pesa callbacks by matching bill_ref_number
 * to student adm_no. Matched payments are reconciled; unmatched are orphaned.
 */
let _autoProcessing = false;
export async function autoProcessMpesaCallbacks() {
  if (!_currentSchoolId || _autoProcessing) return { processed: 0, orphaned: 0 };
  _autoProcessing = true;
  window.dispatchEvent(new CustomEvent('mpesaAutoProcessStart'));

  let processed = 0, orphaned = 0;

  try {
    // 1. Fetch only 'pending' callbacks (not already orphaned/failed)
    const { data: pending, error: fetchErr } = await supabase
      .from('mpesa_callbacks')
      .select('*')
      .eq('school_id', _currentSchoolId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (fetchErr || !pending || pending.length === 0) {
      return { processed: 0, orphaned: 0 };
    }

    // 2. Fetch all students for this school (for matching)
    const { data: allStudents, error: studErr } = await supabase
      .from('students')
      .select('id, adm_no, name')
      .eq('school_id', _currentSchoolId);

    if (studErr || !allStudents) {
      return { processed: 0, orphaned: 0 };
    }

    // 3. Build a lookup map: normalised admission number → student id
    const admLookup = {};
    for (const s of allStudents) {
      if (s.adm_no) {
        admLookup[s.adm_no.trim().toUpperCase()] = s.id;
      }
    }

    // 4. Process each pending callback
    for (const cb of pending) {
      const ref = (cb.bill_ref_number || '').trim().toUpperCase();
      const matchedStudentId = admLookup[ref];

      if (matchedStudentId) {
        // Auto-reconcile
        try {
          await reconcileMpesaPayment(cb.id, matchedStudentId);
          processed++;
        } catch (e) {
          console.error(`Auto-reconcile failed for ${cb.mpesa_receipt_number}:`, e.message);
        }
      } else {
        // Mark as orphaned for manual review
        await supabase
          .from('mpesa_callbacks')
          .update({ status: 'orphaned' })
          .eq('id', cb.id);
        orphaned++;
      }
    }

    if (processed > 0) {
      await logPlatformActivity(
        'MPESA_AUTO_RECONCILED',
        `Auto-reconciled ${processed} payment(s). ${orphaned} orphaned for manual review.`
      );
    }
  } catch (e) {
    console.error('Auto-process M-Pesa error:', e);
  } finally {
    _autoProcessing = false;
    window.dispatchEvent(new CustomEvent('mpesaAutoProcessEnd', {
      detail: { processed, orphaned }
    }));
  }

  return { processed, orphaned };
}

/**
 * Simulate an M-Pesa Daraja callback for testing.
 * Inserts a mock record into mpesa_callbacks and triggers auto-processing.
 */
export async function simulateMpesaCallback({ amount, phone, admNo, receiptNumber }) {
  if (!_currentSchoolId) throw new Error('No school context.');

  const receipt = receiptNumber || `SIM${Date.now()}`;
  const { error } = await supabase.from('mpesa_callbacks').insert([{
    school_id: _currentSchoolId,
    mpesa_receipt_number: receipt,
    amount: Number(amount),
    phone_number: phone || '2547XXXXXXXX',
    bill_ref_number: admNo,
    transaction_date: new Date().toISOString(),
    status: 'pending',
    created_at: new Date().toISOString()
  }]);

  if (error) throw error;

  // Immediately trigger auto-processing
  const result = await autoProcessMpesaCallbacks();

  return { receipt, ...result };
}

/**
 * Manually reconcile an orphaned payment to a student
 */
export async function reconcileMpesaPayment(callbackId, studentId) {
  const { data: callback, error: cbError } = await supabase
    .from('mpesa_callbacks')
    .select('*')
    .eq('id', callbackId)
    .single();
  
  if (cbError) throw cbError;
  if (!callback) throw new Error("Payment record not found.");

  // 1. Update the callback status
  const { error: updateError } = await supabase
    .from('mpesa_callbacks')
    .update({ 
      student_id: studentId,
      status: 'processed'
    })
    .eq('id', callbackId);
  
  if (updateError) throw updateError;

  // 2. Add to student fees
  const { data: fee, error: feeError } = await supabase
    .from('fees')
    .select('*')
    .eq('student_id', studentId)
    .eq('period_id', _currentPeriodId)
    .single();
  
  if (!feeError && fee) {
    const newPaid = Number(fee.paid) + Number(callback.amount);
    const newBal = Number(fee.total_fee) - newPaid;

    await supabase
      .from('fees')
      .update({
        paid: newPaid,
        balance: newBal,
        updated_at: new Date().toISOString()
      })
      .eq('id', fee.id);
  }

  // 3. Log activity
  await logPlatformActivity('PAYMENT_RECONCILED', `Reconciled payment ${callback.mpesa_receipt_number} to student ID ${studentId}`);

  return { success: true };
}

// ==========================================
// M-PESA MAGIC AUTOMATION ORCHESTRATOR
// ==========================================
export async function simulateMpesaSTKPush(student, amount, phone) {
  // 1. Simulate Network Delay (STK Push pop-up on user's phone)
  await new Promise(resolve => setTimeout(resolve, 2500));

  // 2. Generate generic M-pesa reference
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const mpesaRef = Array.from({length: 10}, () => chars[Math.floor(Math.random() * chars.length)]).join('');

  // 3. Process the actual payment in the ledger
  const payment = await recordPayment(student.id, amount, 'M-Pesa', mpesaRef);

  // 4. Inject into mpesa_logs to simulate Daraja API webhook firing
  await supabase.from('mpesa_callbacks').insert({
    school_id: _currentSchoolId,
    phone_number: phone,
    amount: amount,
    mpesa_receipt_number: mpesaRef,
    bill_ref_number: student.adm_no || student.admNo || 'DEF',
    status: 'processed',
    student_id: student.id,
    raw_payload: { mocked: true }
  });

  // 5. Synthesize an automated SMS receipt into the offline communications store
  const { db } = await import('./offlineStore');
  await db.communications.add({
    type: 'SMS',
    target: 'single',
    message: `Dear Parent, we confirm receipt of Ksh ${amount} via M-Pesa (${mpesaRef}) for ${student.name}. Thank you.`,
    timestamp: new Date().toISOString(),
    user: 'M-Pesa Auto-Bot',
    recipientCount: 1
  });

  return payment;
}

// ==========================================
// SUPABASE STORAGE HELPERS (LMS OPTIMZATION)
// ==========================================

/**
 * Uploads a text or JSON blob to Supabase Storage and returns the public URL.
 * Used to keep large assignment/submission content OUT of the Postgres database.
 */
async function uploadToLmsStorage(path, content) {
  const blob = new Blob([typeof content === 'string' ? content : JSON.stringify(content)], { type: 'application/json' });
  const { data, error } = await supabase.storage.from('lms-content').upload(path, blob, { upsert: true });
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage.from('lms-content').getPublicUrl(data.path);
  return publicUrl;
}

/**
 * Fetches text content from a Supabase Storage URL.
 */
export async function fetchLmsContent(url) {
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { return text; }
}

// ==========================================
// LMS (ACADEMIC LEARNING) — Support Functions
// ==========================================

export async function getAssignmentStats(assignmentId, className, stream) {
  const { count: submitted } = await supabase.from('lms_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('assignment_id', assignmentId);
    
  let query = supabase.from('students').select('*', { count: 'exact', head: true }).eq('class', className);
  if (stream && stream !== 'General' && stream !== '') query = query.eq('stream', stream);
  
  const { count: total } = await query;
  return { submitted: submitted || 0, total: total || Math.max(submitted || 0, 1) };
}

export async function submitAssignment(assignmentId, student, payload) {
  const fileId = `submissions/${_currentSchoolId}/${assignmentId}_${student.id}_${Date.now()}.json`;
  const contentUrl = await uploadToLmsStorage(fileId, payload);
  
  const { data, error } = await supabase.from('lms_submissions').upsert({
    assignment_id: assignmentId,
    student_id: student.id,
    content_url: contentUrl,
    quiz_results: payload?.quiz_results || null,
  }, { onConflict: 'assignment_id,student_id' }).select().single();
  
  if (error) throw error;
  return data;
}

export async function getQuizAnalytics(assignmentId) {
  const { data: ast, error: e1 } = await supabase.from('lms_assignments').select('quiz_config, max_score, title').eq('id', assignmentId).single();
  if (e1) throw e1;
  const { data: subs, error: e2 } = await supabase.from('lms_submissions').select('quiz_results, grade_numeric').eq('assignment_id', assignmentId);
  if (e2) throw e2;

  const totalSubmissions = subs.length;
  if (totalSubmissions === 0) return { totalSubmissions: 0, questionStats: [] };

  const questions = ast.quiz_config || [];
  const questionStats = questions.map((q, idx) => {
    let correctCount = 0;
    subs.forEach(s => { if (s.quiz_results?.answers?.[idx]?.correct) correctCount++; });
    return { id: q.id, text: q.text, successRate: (correctCount / totalSubmissions) * 100 };
  });

  const scores = subs.map(s => s.grade_numeric || 0);
  return {
    title: ast.title,
    maxScore: ast.max_score,
    totalSubmissions,
    avgScore: (scores.reduce((a, b) => a + b, 0) / totalSubmissions).toFixed(1),
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    questionStats
  };
}

export async function getStudentSubmissions(studentId) {
  const { data, error } = await supabase.from('lms_submissions').select('*, lms_assignments(title, subject, due_date, max_score)').eq('student_id', studentId);
  if (error) throw error;
  return data || [];
}

export async function updateSubmission(submissionId, updates) {
  const { data, error } = await supabase.from('lms_submissions').update(updates).eq('id', submissionId).select().single();
  if (error) throw error;
  return data;
}

// COMMUNICATIONS (SMS/WHATSAPP BROADCASTS)
// ==========================================

export async function logCommunication(comm) {
  mutationGuard('logCommunication');
  if (!_currentSchoolId) throw new Error('No school context');
  
  const creatorId = (await getUserByAuthId(_currentAuthUser?.id))?.id;
  
  if (comm.type === 'sms' || comm.type === 'whatsapp') {
    // If it's a broadcast, create an announcement record as well
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        school_id: _currentSchoolId,
        created_by: creatorId,
        title: comm.channel === 'whatsapp' ? 'WhatsApp Broadcast' : 'SMS Broadcast',
        content: comm.message,
        target_audience: comm.target,
        status: 'published',
        metadata: {
          recipient_count: comm.count,
          channel: comm.type
        }
      })
      .select()
      .single();
    if (error) console.error('Failed to log announcement:', error);
    return data;
  }
  
  return { id: 'log-' + Date.now(), ...comm };
}

export async function sendSMSMessage(recipients, message) {
  const count = Array.isArray(recipients) ? recipients.length : 1;
  console.log(`[SMS GATEWAY] Sending to ${count} recipients: "${message}"`);
  return { success: true, count };
}

export async function sendWhatsAppMessage(recipients, message) {
  const count = Array.isArray(recipients) ? recipients.length : 1;
  if (count === 1) {
    const phone = Array.isArray(recipients) ? recipients[0] : recipients;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone.startsWith('0') ? '254' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }
  console.log(`[WHATSAPP GATEWAY] Broadcasting to ${count} recipients: "${message}"`);
  return { success: true, count };
}

export function getWhatsAppLink(phone, message = '') {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const prefix = cleanPhone.startsWith('0') ? '254' : '';
  return `https://wa.me/${prefix}${cleanPhone}${message ? '?text=' + encodeURIComponent(message) : ''}`;
}

export async function getCommunicationLogs() {
  // Mock history for now to satisfy UI
  return [];
}

// ==========================================
// PLATFORM HEALTH (SUPERADMIN USAGE)
// ==========================================


// ============================================================================
// ██████  NEW MODULES: SCHOOL DIRECTORY, CLASSES, LIBRARY, TIMETABLE,
//         E-LEARNING, EXAMS, COMMUNICATION, NOTIFICATIONS
// ============================================================================

// ================================
// SCHOOL DIRECTORY (Public)
// ================================

export async function searchPublicSchools(query) {
  if (!query || query.trim().length < 2) return [];
  const { data, error } = await supabase.rpc('search_public_schools', { search_query: query.trim() });
  if (error) throw error;
  return data || [];
}

export async function getSchoolByCode(code) {
  const { data, error } = await supabase
    .from('schools')
    .select('id, name, school_code, location, school_type, publicly_listed')
    .eq('school_code', code)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ================================
// CLASSES (Normalized)
// ================================

export async function getClasses() {
  if (!_currentSchoolId) return [];
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('school_id', _currentSchoolId)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function addClass({ name, level, stream = 'General', curriculum_type = 'both' }) {
  mutationGuard('addClass');
  if (!_currentSchoolId) throw new Error('No school context');
  const { data, error } = await supabase
    .from('classes')
    .insert({ school_id: _currentSchoolId, name, level, stream, curriculum_type })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClass(id, updates) {
  mutationGuard('updateClass');
  const { data, error } = await supabase
    .from('classes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteClass(id) {
  mutationGuard('deleteClass');
  const { error } = await supabase.from('classes').delete().eq('id', id);
  if (error) throw error;
}

// Redundant enhanced Library functions removed (Refactored to libraryStore.js)

// ================================
// TIMETABLE MODULE
// ================================

// Periods (day structure)
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

// TT Subjects
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

// Teacher-Subject Assignments
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

// Teacher Availability
export async function getTTAvailability(teacherId) {
  const { data, error } = await supabase
    .from('tt_teacher_availability')
    .select('*')
    .eq('teacher_id', teacherId);
  if (error) throw error;
  return data || [];
}

export async function saveTTAvailability(entries) {
  mutationGuard('saveTTAvailability');
  if (!_currentSchoolId) throw new Error('No school context');
  const payload = entries.map(e => ({ ...e, school_id: _currentSchoolId }));
  const { error } = await supabase.from('tt_teacher_availability').upsert(payload, { onConflict: 'teacher_id,day_of_week,period_id' });
  if (error) throw error;
}

// Slots
export async function getTTSlots(classId = null, dayOfWeek = null) {
  if (!_currentSchoolId) return [];
  let q = supabase
    .from('tt_slots')
    .select('*, tt_subjects(name, short_code, color_hex), users!tt_slots_teacher_id_fkey(name), classes(name, stream), tt_periods(name, start_time, end_time, order_index)')
    .eq('school_id', _currentSchoolId);
  if (classId) q = q.eq('class_id', classId);
  if (dayOfWeek) q = q.eq('day_of_week', dayOfWeek);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function saveTTSlot(slot) {
  mutationGuard('saveTTSlot');
  if (!_currentSchoolId) throw new Error('No school context');
  const creatorId = (await getUserByAuthId(_currentAuthUser?.id))?.id;
  const payload = { ...slot, school_id: _currentSchoolId, created_by: creatorId, updated_at: new Date().toISOString() };
  if (slot.id) {
    const { data, error } = await supabase.from('tt_slots').update(payload).eq('id', slot.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('tt_slots').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTTSlot(id) {
  mutationGuard('deleteTTSlot');
  const { error } = await supabase.from('tt_slots').delete().eq('id', id);
  if (error) throw error;
}

// Weekly Targets
export async function getTTWeeklyTargets(classId) {
  const { data, error } = await supabase
    .from('tt_weekly_targets')
    .select('*, tt_subjects(name)')
    .eq('class_id', classId);
  if (error) throw error;
  return data || [];
}

export async function saveTTWeeklyTarget({ classId, subjectId, minLessons, maxLessons }) {
  mutationGuard('saveTTWeeklyTarget');
  if (!_currentSchoolId) throw new Error('No school context');
  const { data, error } = await supabase
    .from('tt_weekly_targets')
    .upsert({ school_id: _currentSchoolId, class_id: classId, subject_id: subjectId, min_lessons: minLessons, max_lessons: maxLessons },
      { onConflict: 'class_id,subject_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ================================
// E-LEARNING ASSIGNMENTS
// ================================

export async function getAssignments(filters = {}) {
  if (!_currentSchoolId) return [];

  if (!_currentAuthUser && _currentSchoolId) {
    const { data, error } = await supabase.rpc('portal_get_assignments', { 
      p_school_id: _currentSchoolId,
      p_class_id: filters.classId || null
    });
    if (error) throw error;
    return data || [];
  }
  let q = supabase
    .from('el_assignments')
    .select('*')
    .eq('school_id', _currentSchoolId)
    .order('created_at', { ascending: false });
  if (filters.classId) q = q.eq('class_id', filters.classId);
  if (filters.teacherId) q = q.eq('teacher_id', filters.teacherId);
  if (filters.status) q = q.eq('status', filters.status);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createAssignment(assignment) {
  mutationGuard('createAssignment');
  if (!_currentSchoolId) throw new Error('No school context');
  
  const payload = {
    school_id: _currentSchoolId,
    title: assignment.title,
    class: assignment.class,
    stream: assignment.stream,
    subject: assignment.subject,
    description: assignment.description,
    links: assignment.links,
    allow_from: assignment.allowFrom,
    due_date: assignment.dueDate,
    cutoff_date: assignment.cutoffDate,
    max_score: assignment.maxScore,
    submission_type: assignment.submissionType,
    questions: assignment.questions,
    teacher: assignment.teacher
  };

  const { data, error } = await supabase
    .from('el_assignments')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAssignment(id, updates) {
  mutationGuard('updateAssignment');
  const { data, error } = await supabase
    .from('el_assignments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function publishAssignment(id) {
  return updateAssignment(id, { status: 'published', published_at: new Date().toISOString() });
}

export async function closeAssignment(id) {
  return updateAssignment(id, { status: 'closed', closed_at: new Date().toISOString() });
}

export async function deleteAssignment(id) {
  mutationGuard('deleteAssignment');
  const { error } = await supabase.from('el_assignments').delete().eq('id', id);
  if (error) throw error;
}

// Submissions
export async function getSubmissions(assignmentId) {
  const { data, error } = await supabase
    .from('el_submissions')
    .select('*, students(name, adm_no, class)')
    .eq('assignment_id', assignmentId)
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// (Exams module functions moved to Phase 4 section above ~line 1353)

// ================================
// COMMUNICATION — ANNOUNCEMENTS
// ================================

export async function getAnnouncements(filters = {}) {
  if (!_currentSchoolId) return [];

  if (!_currentAuthUser && _currentSchoolId) {
    const { data, error } = await supabase.rpc('portal_get_announcements', { p_school_id: _currentSchoolId });
    if (error) throw error;
    return data || [];
  }

  let q = supabase
    .from('announcements')
    .select('*, users!announcements_created_by_fkey(name), announcement_reads(user_id)')
    .eq('school_id', _currentSchoolId)
    .order('created_at', { ascending: false });
  if (filters.status) q = q.eq('status', filters.status);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createAnnouncement(ann) {
  mutationGuard('createAnnouncement');
  if (!_currentSchoolId) throw new Error('No school context');
  const creatorId = (await getUserByAuthId(_currentAuthUser?.id))?.id;
  const { data, error } = await supabase
    .from('announcements')
    .insert({ ...ann, school_id: _currentSchoolId, created_by: creatorId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markAnnouncementRead(announcementId) {
  const userId = (await getUserByAuthId(_currentAuthUser?.id))?.id;
  if (!userId) return;
  await supabase
    .from('announcement_reads')
    .upsert({ announcement_id: announcementId, user_id: userId },
      { onConflict: 'announcement_id,user_id' });
}

// ================================
// COMMUNICATION — MESSAGES
// ================================

export async function getMessages(otherUserId = null) {
  const userId = (await getUserByAuthId(_currentAuthUser?.id))?.id;
  if (!userId) return [];
  let q = supabase
    .from('messages')
    .select('*, sender:users!messages_sender_id_fkey(name, role), recipient:users!messages_recipient_id_fkey(name, role)')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (otherUserId) {
    q = supabase
      .from('messages')
      .select('*, sender:users!messages_sender_id_fkey(name, role), recipient:users!messages_recipient_id_fkey(name, role)')
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
      .order('created_at', { ascending: true });
  }
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function sendMessage({ recipientId, body }) {
  mutationGuard('sendMessage');
  if (!_currentSchoolId) throw new Error('No school context');
  const senderId = (await getUserByAuthId(_currentAuthUser?.id))?.id;
  if (!senderId) throw new Error('Cannot determine sender');
  const { data, error } = await supabase
    .from('messages')
    .insert({ school_id: _currentSchoolId, sender_id: senderId, recipient_id: recipientId, body })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markMessageRead(messageId) {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) throw error;
}

// ================================
// NOTIFICATIONS
// ================================

export async function getNotifications(unreadOnly = false) {
  const userId = (await getUserByAuthId(_currentAuthUser?.id))?.id;
  if (!userId) return [];
  let q = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (unreadOnly) q = q.eq('is_read', false);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getUnreadNotificationCount() {
  const userId = (await getUserByAuthId(_currentAuthUser?.id))?.id;
  if (!userId) return 0;
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) return 0;
  return count || 0;
}

export async function markNotificationRead(notifId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notifId);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const userId = (await getUserByAuthId(_currentAuthUser?.id))?.id;
  if (!userId) return;
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
}

export async function createNotification({ userId, type, title, body, referenceType, referenceId }) {
  if (!_currentSchoolId) throw new Error('No school context');
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      school_id: _currentSchoolId,
      user_id: userId,
      type, title, body,
      reference_type: referenceType,
      reference_id: referenceId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Notification Preferences
export async function getNotificationPreferences() {
  const userId = (await getUserByAuthId(_currentAuthUser?.id))?.id;
  if (!userId) return [];
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

export async function updateNotificationPreference(prefId, updates) {
  const { error } = await supabase
    .from('notification_preferences')
    .update(updates)
    .eq('id', prefId);
  if (error) throw error;
}

// ================================
// REALTIME SUBSCRIPTIONS (enhanced)
// ================================

export function subscribeToNotifications(userId, callback) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => callback(payload.new)
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function subscribeToMessages(userId, callback) {
  const channel = supabase
    .channel(`messages:${userId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` },
      (payload) => callback(payload.new)
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// Auto-sync every 60s if online
setInterval(triggerSync, 60000);
window.addEventListener('online', triggerSync);
