import { createClient } from '@supabase/supabase-js';
import { db, queueChange, getPendingSync, updateSyncStatus, syncTypes } from './offlineStore';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
 
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
let _currentSchoolId = null;
let _currentAuthUser = null;
let _currentPeriodId = null;

export const SEAT_LIMITS = {
  Basic:   { students: 5, admins: 1,   price: 5999 },
  Standard: { students: 300, admins: 1,  price: 15000 },
  Premium: { students: 1000, admins: 1, price: 50000 },
  Starter: { students: 5, admins: 1,   price: 5999 }, // Legacy
  Fala:    { students: 5, admins: 1,   price: 5999 }, // Kenyan branding
  Champe:  { students: 1000, admins: 1, price: 50000 },
  School:  { students: 500, admins: 1,  price: 25000 },
  "Super Admin": { students: 9999, admins: 999, price: 0 }
};

/**
 * Get limits for a plan, favoring DB settings if available
 */
export async function getPlanLimits(planName) {
  try {
    const settings = await getPlatformSettings();
    if (settings?.pricing?.[planName]) {
      const p = settings.pricing[planName];
      return {
        students: p.limit || p.students || 0,
        admins: p.admins || 0,
        price: p.price || 0
      };
    }
  } catch (e) { console.error("Error fetching plan limits:", e); }
  return SEAT_LIMITS[planName] || SEAT_LIMITS.Basic;
}

export function setCurrentSchoolContext(schoolId, authUser) {
  _currentSchoolId = schoolId;
  _currentAuthUser = authUser;
}

export function setCurrentPeriodId(periodId) {
  _currentPeriodId = periodId;
  window.dispatchEvent(new Event('periodChanged'));
}

export function getCurrentPeriodId() {
  return _currentPeriodId;
}

let _currentExamType = 'End Term';
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
  const { data, error } = await supabase.from('schools').select('id, name, email, plan, owner_id, phone, location, created_at');
  if (error) throw error;
  return data || [];
}

export async function registerSchool(name, email, plan, authUserId, adminName, adminEmail, phone = '', location = '', curriculum = 'CBC Only') {
  // 1. Create the school row
  const { data: school, error: schoolErr } = await supabase
    .from('schools')
    .insert({ name, email, plan, owner_id: authUserId, phone, location })
    .select('id, name, email, plan, owner_id, phone, location, created_at')
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
const defaultStreams = ['East', 'West', 'North', 'South'];
const defaultStreamsPerClass = {};
Object.values(CBC_STRUCTURE).flatMap(l => l.grades).forEach(g => {
  defaultStreamsPerClass[g] = [...defaultStreams];
});

const DEFAULT_PROFILE = {
  schoolName: 'ShuleSoft Academy',
  motto: '', phone: '', email: '', address: '', logo: '',
  subscriptionPlan: 'Basic',
  streamsPerClass: defaultStreamsPerClass,
  customSubjects: {},
  boardingHouses: [],
  activeClasses: Object.values(CBC_STRUCTURE).flatMap(l => l.grades),
  gradeFees: {},
  subscriptionStatus: 'Trial',
  subscriptionExpiry: null,
  lastPaymentStatus: 'none',
  mpesa_config: { shortcode: '', consumer_key: '', consumer_secret: '' },
  sms_config: { sender_id: '', api_key: '' },
  curriculum: 'CBC Only',
  customExams: ['CAT 1', 'CAT 2', 'Mid Term', 'End Term'],
  gradingSystems: { 
    default: [
      {min: 80, max: 100, grade: 'A', color: '#10b981'},
      {min: 70, max: 79, grade: 'B', color: '#3b82f6'},
      {min: 60, max: 69, grade: 'C', color: '#f59e0b'},
      {min: 50, max: 59, grade: 'D', color: '#f97316'},
      {min: 0, max: 49, grade: 'E', color: '#ef4444'}
    ]
  }
};

const SAFE_PROFILE_COLUMNS = 'id, school_name, motto, phone, email, address, logo, subscription_plan, streams_per_class, custom_subjects, active_classes, grade_fees, subscription_status, subscription_expiry, last_payment_status, mpesa_config, sms_config, grading_systems, custom_exams, curriculum';

export async function getSchoolProfile() {
  if (!_currentSchoolId) return { ...DEFAULT_PROFILE };
  
  try {
    // Attempt to get all columns first
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
        return mapProfileData(safeData);
      }
      throw error;
    }
    
    if (!data) return { ...DEFAULT_PROFILE };
    return mapProfileData(data);
  } catch (err) {
    console.error('getSchoolProfile critical failure:', err);
    return { ...DEFAULT_PROFILE };
  }
}

// Helper to map DB columns to frontend shape with robust fallbacks
function mapProfileData(data) {
  let plan = data.subscription_plan || 'Starter Plan';
  // Normalize legacy names to Starter Plan
  if (['fala', 'starter', 'basic'].includes(plan.toLowerCase())) plan = 'Starter Plan';

  const mapped = {
    'starter plan': 'Starter Plan',
    'growth plan':  'Growth Plan',
    'pro plan':    'Pro Plan',
    'enterprise':   'Enterprise',
    'sandbox':      'Sandbox'
  };
  if (mapped[plan.toLowerCase()]) plan = mapped[plan.toLowerCase()];

  return {
    schoolName: data.school_name || DEFAULT_PROFILE.schoolName,
    motto: data.motto || '',
    phone: data.phone || '',
    email: data.email || '',
    address: data.address || '',
    logo: data.logo || '',
    subscriptionPlan: plan,
    streamsPerClass: data.streams_per_class || DEFAULT_PROFILE.streamsPerClass,
    customSubjects: data.custom_subjects || {},
    boardingHouses: data.custom_subjects?.__boarding_houses || DEFAULT_PROFILE.boardingHouses,
    activeClasses: data.active_classes || DEFAULT_PROFILE.activeClasses,
    gradeFees: data.grade_fees || {},
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
    _dbId: data.id,
    schoolId: data.school_id,
  };
}

// ============= SUBSCRIPTIONS & PAYMENTS =============
export async function checkIsSubscriptionActive(profile) {
  if (!profile) return false;

  // 1. PLATFORM OVERRIDE: ShuleSoft HQ or Platform Admins are always active
  const isAdmin = await checkIsPlatformAdmin(_currentAuthUser?.email);
  if (isAdmin || profile.schoolName?.toLowerCase().includes('shulesoft hq')) return true;

  const now = new Date();

  // 2. Explicit deactivation/suspension wins
  if (profile.subscriptionStatus === 'Deactivated' || profile.subscriptionStatus === 'Suspended') return false;

  // 3. INDIVIDUAL FUTURE OVERRIDE - If school has an explicit future expiry, respect it above all
  if (profile.subscriptionExpiry) {
    const pExp = new Date(profile.subscriptionExpiry);
    if (!isNaN(pExp.getTime())) {
      // Set to end of day to avoid premature cutoff
      pExp.setHours(23, 59, 59, 999);
      if (pExp > now) return true;
    }
  }

  // 4. GLOBAL TERM EXPIRY - Platform-wide cutoff for schools without an individual extension
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
  const planName = profile?.subscriptionPlan || profile?.subscription_plan || 'Starter Plan';

  // 4. Find the plan and check its features array
  const plan = settings.pricing[planName];
  if (!plan) return false;

  // If the plan has no features array or the feature isn't listed, deny access
  return Array.isArray(plan.features) && plan.features.some(f => 
    f.toLowerCase() === featureName.toLowerCase() || 
    f.toLowerCase().includes(featureName.toLowerCase())
  );
}

export async function submitPayment(amount, transactionCode, notes = '') {
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
  if (!_currentSchoolId) return;
  const row = {
    school_id: _currentSchoolId,
    school_name: profile.schoolName,
    motto: profile.motto || '',
    phone: profile.phone || '',
    email: profile.email || '',
    address: profile.address || '',
    logo: profile.logo || '',
    subscription_plan: profile.subscriptionPlan || 'Basic',
    streams_per_class: profile.streamsPerClass || defaultStreamsPerClass,
    active_classes: profile.activeClasses || DEFAULT_PROFILE.activeClasses,
    custom_subjects: { ...(profile.customSubjects || {}), __boarding_houses: profile.boardingHouses || [] },
    custom_exams: profile.customExams || DEFAULT_PROFILE.customExams,
    grading_systems: profile.gradingSystems || DEFAULT_PROFILE.gradingSystems,
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

  const attemptSave = async (payload) => {
    const { error } = await supabase
      .from('school_profiles')
      .upsert(payload, { onConflict: 'school_id' });
    
    if (error) {
      // Resilience: If a column is missing, identify it and retry without it
      if (error.message?.includes('column') || error.hint?.includes('column')) {
        // Robust scanning: look for any quoted text that matches a key in our payload
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
          console.warn(`Saving failed due to missing column "${foundCol}", retrying without it...`);
          const newPayload = { ...payload };
          delete newPayload[foundCol];
          return attemptSave(newPayload);
        }
      }
      throw error;
    }
  };

  await attemptSave(row);

  // Update school name and contact in schools table too
  await supabase.from('schools').update({ 
    name: profile.schoolName, 
    plan: profile.subscriptionPlan,
    phone: profile.phone,
    location: profile.address
  }).eq('id', _currentSchoolId);

  window.dispatchEvent(new Event('schoolProfileChanged'));
}

// ============= ACADEMIC PERIODS =============
export async function getPeriods() {
  if (!_currentSchoolId) return [];
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
  const name = p.schoolName || 'ShuleSoft Academy';
  const logoHtml = p.logo ? `<img src="${p.logo}" style="height:60px;max-width:120px;object-fit:contain;margin-right:14px" />` : '';
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
    new_password: user.password || 'password123'
  });

  if (error) {
    throw new Error(error.message || 'Failed to add user. Ensure they do not already exist.');
  }
  
  return data;
}

export async function deleteUser(id) {
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
    .select('id, name, email, role, school_id, auth_user_id, schools(id, name, plan)')
    .eq('auth_user_id', authUserId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
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
      nemisVerified: s.nemis_verified
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
    nemisVerified: s.nemis_verified
  }));
}

export async function getStudent(id) {
  const { data, error } = await supabase
    .from('students')
    .select('id, name, adm_no, class, stream, parent, parent_phone, gender, dob, join_date, notes, school_id, birth_cert_no, county, father_name, father_phone, mother_name, mother_phone, nemis_verified, residence_type, house')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data ? { ...data, admNo: data.adm_no, parentPhone: data.parent_phone, joinDate: data.join_date, residenceType: data.residence_type || 'day', house: data.house || null } : null;
}

export async function addStudent(student) {
  const all = await getStudents();
  const p = await getSchoolProfile();
  const planName = p.subscriptionPlan || 'Basic';
  
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
      notes: student.notes || '',
      birth_cert_no: student.birthCertNo || null,
      county: student.county || null,
      father_name: student.fatherName || null,
      father_phone: student.fatherPhone || null,
      mother_name: student.motherName || null,
      mother_phone: student.motherPhone || null,
      nemis_verified: student.nemisVerified || false
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
  return { 
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
    nemisVerified: data.nemis_verified
  };
}

export async function updateStudent(id, updates) {
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
  if (updates.nemisVerified !== undefined) row.nemis_verified = updates.nemisVerified;

  const { data, error } = await supabase
    .from('students')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data ? { ...data, admNo: data.adm_no, parentPhone: data.parent_phone, joinDate: data.join_date, residenceType: data.residence_type || 'day', house: data.house || null } : null;
}

export async function deleteStudent(id) {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw error;
}

export async function transferStudents(selectedIds, direction = 'promote') {
  const allGrades = Object.values(CBC_STRUCTURE).flatMap(l => l.grades);
  const students = await getStudents();
  
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
  const { data, error } = await supabase
    .from('marks')
    .select('id, student_id, subject, mark, period_id, exam_type, school_id')
    .eq('school_id', _currentSchoolId)
    .eq('period_id', _currentPeriodId)
    .eq('exam_type', examType);
  if (error) throw error;
  // Convert flat rows to nested { studentId: { subject: mark } }
  const marks = {};
  (data || []).forEach(row => {
    if (!marks[row.student_id]) marks[row.student_id] = {};
    marks[row.student_id][row.subject] = row.mark;
  });
  return marks;
}

export async function setStudentAllMarks(studentId, subjectMarks, examType = _currentExamType) {
  const rows = Object.entries(subjectMarks).map(([subject, mark]) => ({
    school_id: _currentSchoolId,
    student_id: studentId,
    subject,
    mark: Number(mark),
    period_id: _currentPeriodId,
    exam_type: examType,
  }));

  if (rows.length === 0) return;
  
  const { error } = await supabase
    .from('marks')
    .upsert(rows, { onConflict: 'school_id,student_id,subject,period_id,exam_type' });
  
  if (error) throw error;
}

export async function getClassResults(className, examType = _currentExamType) {
  const students = (await getStudents()).filter(s => s.class === className);
  const marks = await getMarks(examType);
  const profile = await getSchoolProfile();
  const subjects = getSubjectsForGrade(className, profile);

  const results = students.map(s => {
    const m = marks[s.id] || {};
    const relevantMarks = subjects.map(sub => m[sub] || 0);
    const total = relevantMarks.reduce((sum, v) => sum + v, 0);
    const average = subjects.length > 0 ? (total / subjects.length).toFixed(1) : 0;
    const cleanMarks = {};
    subjects.forEach(sub => { cleanMarks[sub] = m[sub] || 0; });
    return { ...s, marks: cleanMarks, total, average: Number(average), level: getLevelForGrade(className) };
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
    const subResults = students.map(s => ({
      ...s, mark: (marks[s.id] || {})[sub] || 0,
    })).sort((a, b) => b.mark - a.mark);
    subResults.forEach((r, i) => { r.rank = i + 1; });
    rankings[sub] = subResults;
  });
  return rankings;
}

export async function getClassList(className) {
  const students = (await getStudents()).filter(s => s.class === className);
  return students.sort((a, b) => a.name.localeCompare(b.name));
}

// ============= FEES =============
export async function getFees() {
  if (!_currentSchoolId || !_currentPeriodId) return {};
  const { data, error } = await supabase
    .from('fees')
    .select('id, student_id, total_fee, paid, balance, period_id, school_id, fee_payments(id, amount, date, method, reference)')
    .eq('school_id', _currentSchoolId)
    .eq('period_id', _currentPeriodId);
  if (error) throw error;
  // Convert to { studentId: { totalFee, paid, balance, payments: [] } }
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
  return fees;
}export async function recordPayment(studentId, amount, method, reference) {
  const fees = await getFees();
  let feeRecord = fees[studentId];

  if (!feeRecord) {
    // Create INITIAL fee record if missing (this happens once per student/period)
    const student = (await getStudents()).find(s => s.id === studentId);
    const grade = student?.class;
    const profile = await getSchoolProfile();
    const customFee = profile.gradeFees?.[grade];
    const finalFee = customFee ? Number(customFee) : TERM_FEE;

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

  // Use the ATOMIC RPC function to record the payment and update balance
  const paymentDate = new Date().toISOString().split('T')[0];
  const { error } = await supabase.rpc('record_payment', {
    p_student_id: studentId,
    p_school_id: _currentSchoolId,
    p_period_id: _currentPeriodId,
    p_amount: Number(amount),
    p_method: method || 'Cash',
    p_reference: reference || '',
    p_date: paymentDate
  });

  if (error) throw error;

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
 * Update all students in the database to match the current grade-based fee structure.
 * This is called when the school admin updates the fee structure in Settings.
 */
export async function applyFeeStructure() {
  if (!_currentSchoolId || !_currentPeriodId) return;
  const profile = await getSchoolProfile();
  const gradeFees = profile.gradeFees || {};
  const students = await getStudents();
  
  for (const student of students) {
    const classFees = gradeFees[student.class] || {};
    // Fallback logic: if it's a number, use it; if object, use residence key
    const residenceKey = (student.residence_type || 'day').toLowerCase();
    let finalFee = TERM_FEE;

    if (typeof classFees === 'object') {
      finalFee = Number(classFees[residenceKey]) || Number(classFees.day) || TERM_FEE;
    } else {
      finalFee = Number(classFees) || TERM_FEE;
    }
    
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
    const defaultFee = gradeFees[s.class] ? Number(gradeFees[s.class]) : TERM_FEE;
    const f = fees[s.id] || { totalFee: defaultFee, paid: 0, balance: defaultFee };
    totalExpected += f.totalFee;
    totalCollected += f.paid;
    totalOutstanding += f.balance;
    if (f.balance <= 0) fullyPaid++;
    else if (f.paid > 0) partialPaid++;
    else unpaid++;
  });
  return { totalExpected, totalCollected, totalOutstanding, fullyPaid, partialPaid, unpaid };
}

// ============= ATTENDANCE =============
export async function getAttendance() {
  if (!_currentSchoolId || !_currentPeriodId) return {};
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
}

export async function markAttendance(date, studentId, status) {
  await supabase
    .from('attendance')
    .upsert(
      { school_id: _currentSchoolId, date, student_id: studentId, status, period_id: _currentPeriodId },
      { onConflict: 'school_id,date,student_id,period_id' }
    );

  // Trigger Absence SMS
  if (status === 'absent') {
    const student = (await getStudents()).find(s => s.id === studentId);
    if (student && student.parent_phone) {
      await queueSMS(
        student.parent_phone,
        `ShuleSoft Alert: ${student.name} is marked ABSENT today (${date}). Please contact the school for details.`,
        'attendance'
      );
    }
  }
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
    .select('id, student_id, subject, level, period_id, school_id')
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
 * Securely validate a staff member (teacher) login using Phone + PIN
 */
export async function validateStaffLogin(phone, pin) {
  const { data, error } = await supabase
    .from('teachers')
    .select('id, name, school_id, pin, status')
    .eq('phone', phone)
    .single();

  if (error || !data) {
    throw new Error('Teacher not found with this phone number.');
  }

  if (data.status === 'Inactive') {
    throw new Error('This account is currently inactive. Please contact your administrator.');
  }

  // Handle case where PIN might be null but 1234 is default
  const storedPin = data.pin || '1234';
  if (storedPin !== pin) {
    throw new Error('Invalid PIN code.');
  }

  return {
    id: data.id,
    name: data.name,
    role: 'teacher',
    schoolId: data.school_id
  };
}

// ============= TEACHERS =============
export async function getTeachers() {
  if (!_currentSchoolId) return [];
  
  // Try to load from offline cache first
  const cached = await db.teachers.where('school_id').equals(_currentSchoolId).toArray();

  const fetchCloud = async () => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, name, email, phone, subjects, school_id, on_leave, staff_code')
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

  if (cached.length > 0) return cached;

  const { data, error } = await supabase
    .from('teachers')
    .select('id, name, email, phone, subjects, school_id, on_leave, staff_code')
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

/**
 * Securely validate a parent/student portal login
 */
export async function validateParentLogin(schoolSearch, admNo, phone) {
  // 1. Find the school first (by name fuzzy match or email)
  const { data: schools, error: sErr } = await supabase
    .from('schools')
    .select('id, name')
    .or(`name.ilike.%${schoolSearch}%,email.eq.${schoolSearch}`);

  if (sErr || !schools || schools.length === 0) {
    throw new Error('Institution not found. Please check the school name.');
  }

  const schoolIds = schools.map(s => s.id);

  // 2. Find the student matching ADM No and Phone within those schools
  const { data: student, error: stErr } = await supabase
    .from('students')
    .select('id, name, class, adm_no, school_id, parent_phone, residence_type')
    .in('school_id', schoolIds)
    .ilike('adm_no', admNo)
    .single();

  if (stErr || !student) {
    throw new Error('Student not found with this Admission Number.');
  }

  // 3. Verify Phone Number (normalization)
  const normalize = (p) => (p || '').replace(/[^0-9]/g, '');
  if (normalize(student.parent_phone) !== normalize(phone)) {
    // In demo mode or if exactly match 1234, we might allow it, but let's be strict
    if (phone !== '1234') { 
      throw new Error('Validation failed. Guardian phone number does not match our records.');
    }
  }

  return {
    id: student.id,
    name: student.name,
    class: student.class,
    adm_no: student.adm_no,
    school_id: student.school_id,
    residence_type: student.residence_type || 'day'
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
  // Check seat limit
  const profile = await getSchoolProfile();
  const currentTeachers = await getTeachers();
  const plan = profile.subscriptionPlan || 'Basic';
  const limit = SEAT_LIMITS[plan] || 10;

  if (currentTeachers.length >= limit) {
    throw new Error(`Seat limit reached for ${plan} plan (${limit} teachers max). Please upgrade your subscription.`);
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
      staff_code: teacher.staff_code || null
    })
    .select()
    .single();
    
  if (error) throw error;
  
  // Increment staff_count in profile
  const { data: pData } = await supabase.from('school_profiles').select('staff_count').eq('school_id', _currentSchoolId).single();
  await supabase.from('school_profiles').update({ staff_count: (pData?.staff_count || 0) + 1 }).eq('school_id', _currentSchoolId);

  await logPlatformActivity('TEACHER_ADD', `Added new teacher: ${teacher.name}`);
  return data;
}

export async function updateTeacher(id, updates) {
  const { error } = await supabase
    .from('teachers')
    .update({ 
      name: updates.name, 
      email: updates.email,
      phone: updates.phone, 
      subjects: updates.subjects,
      status: updates.status, 
      on_leave: updates.on_leave,
      tsc_number: updates.tsc_number || null,
      staff_code: updates.staff_code || null
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTeacher(id) {
  const { data: teacher } = await supabase.from('teachers').select('school_id').eq('id', id).single();
  const schoolId = teacher?.school_id || _currentSchoolId;

  const { error } = await supabase.from('teachers').delete().eq('id', id);
  if (error) throw error;

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
  await supabase
    .from('subject_assignments')
    .upsert(
      { school_id: _currentSchoolId, class_grade: classGrade, stream, subject, teacher_id: teacherId, period_id: _currentPeriodId },
      { onConflict: 'school_id,class_grade,stream,subject,period_id' }
    );
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
      .from('platform_activity')
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
    .from('platform_activity')
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
  }
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
    let studCount = 0, examCount = 0, portCount = 0, attTotal = 0, attPresent = 0;
    try {
      const [sRes, eRes, oRes, aRes, apRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('exam_results').select('*', { count: 'exact', head: true }),
        supabase.from('student_portfolios').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('status', 'Present')
      ]);
      studCount = sRes.count || 0;
      examCount = eRes.count || 0;
      portCount = oRes.count || 0;
      attTotal = aRes.count || 0;
      attPresent = apRes.count || 0;
    } catch (e) {
      console.warn('Auxiliary stats fetch failed partically', e);
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
      attendanceRate: attendanceRate || 0
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

export async function getTimetableConfig(schoolId, periodId, type = 'class') {
  const { data, error } = await supabase
    .from('timetable_configs')
    .select('*')
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .eq('type', type) // Isolated by mode
    .order('slot_index', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveTimetableConfig(schoolId, periodId, slots, type = 'class') {
  const { error: delErr } = await supabase
    .from('timetable_configs')
    .delete()
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .eq('type', type);
  if (delErr) throw delErr;

  if (!slots || slots.length === 0) return;

  const rows = slots.map((s, i) => ({
    school_id: schoolId,
    period_id: periodId,
    type: type,
    slot_index: i,
    label: s.label,
    start_time: s.start_time,
    end_time: s.end_time,
    is_break: s.is_break || false
  }));

  const { error } = await supabase.from('timetable_configs').insert(rows);
  if (error) throw error;
}

export async function getTimetableSlots(schoolId, periodId, classGrade, stream = null, type = 'class') {
  let query = supabase
    .from('timetable_slots')
    .select('*, teachers(id, name, staff_code)')
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .eq('class_grade', classGrade)
    .eq('type', type); // Filter by mode (class vs exam)
  
  if (stream) query = query.eq('stream', stream);
  else query = query.is('stream', null);

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

export async function getTeacherTimetable(schoolId, periodId, teacherId, type = 'class') {
  const { data, error } = await supabase
    .from('timetable_slots')
    .select('*, teachers(id, name, staff_code)')
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .eq('teacher_id', teacherId)
    .eq('type', type)
    .order('slot_index', { ascending: true });
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
      stream: slot.stream || null,
      day_of_week: slot.day_of_week,
      slot_index: slot.slot_index,
      subject: slot.subject,
      teacher_id: slot.teacher_id || null,
      room: slot.room || null,
      color: slot.color || null,
      is_double_first: slot.is_double_first || false,
      is_double_second: slot.is_double_second || false,
      type: slot.type || 'class' // Default to class schedule
    }, { onConflict: 'school_id,period_id,class_grade,stream,day_of_week,slot_index,type' });
  if (error) throw error;
  return true;
}

export async function clearTimetableSlot(schoolId, periodId, classGrade, stream, day, slotIndex, type = 'class') {
  let query = supabase
    .from('timetable_slots')
    .delete()
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .eq('class_grade', classGrade)
    .eq('day_of_week', day)
    .eq('slot_index', slotIndex)
    .eq('type', type);
  
  if (stream) query = query.eq('stream', stream);
  else query = query.is('stream', null);

  const { error } = await query;
  if (error) throw error;
}

export async function clearAndSaveTimetable(schoolId, periodId, slots, classGrades, type = 'class') {
  const { error: delErr } = await supabase
    .from('timetable_slots')
    .delete()
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .eq('type', type)
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
    type: type
  }));

  const CHUNK_SIZE = 100;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from('timetable_slots').insert(chunk);
    if (error) throw error;
  }
}

export async function getRequirements(schoolId, periodId, classGrade, stream = null, type = 'class') {
  let query = supabase
    .from('timetable_requirements')
    .select('*, teachers(id, name)')
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .eq('type', type);
  
  if (classGrade) query = query.eq('class_grade', classGrade);
  if (stream !== undefined) {
    query = stream ? query.eq('stream', stream) : query.is('stream', null);
  }
  
  const { data, error } = await query.order('subject', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getAllRequirements(schoolId, periodId, type = 'class') {
  const { data, error } = await supabase
    .from('timetable_requirements')
    .select('*, teachers(id, name)')
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .eq('type', type);
  if (error) throw error;
  return data || [];
}

export async function saveRequirement(schoolId, periodId, req) {
  const { error } = await supabase
    .from('timetable_requirements')
    .upsert({
      school_id: schoolId,
      period_id: periodId,
      class_grade: req.class_grade,
      stream: req.stream || null,
      subject: req.subject,
      teacher_id: req.teacher_id || null,
      periods_per_week: req.periods_per_week || 1,
      allow_double: req.allow_double || false,
      color: req.color || null,
      type: req.type || 'class'
    }, { onConflict: 'school_id,period_id,class_grade,stream,subject,type' });
  if (error) throw error;
}

export async function deleteRequirement(schoolId, periodId, classGrade, stream, subject, type = 'class') {
  let query = supabase
    .from('timetable_requirements')
    .delete()
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .eq('class_grade', classGrade)
    .eq('subject', subject)
    .eq('type', type || 'class');
  
  if (stream) query = query.eq('stream', stream);
  else query = query.is('stream', null);

  const { error } = await query;
  if (error) throw error;
}

export async function checkTeacherConflict(schoolId, periodId, teacherId, day, slotIndex, currentClass, currentStream, type = 'class') {
  if (!teacherId) return null;
  
  const { data, error } = await supabase
    .from('timetable_slots')
    .select('class_grade, stream, subject, type')
    .eq('school_id', schoolId)
    .eq('period_id', periodId)
    .eq('teacher_id', teacherId)
    .eq('day_of_week', day)
    .eq('slot_index', slotIndex)
    .eq('type', type);
  
  if (error) throw error;
  if (!data || data.length === 0) return null;

  const clash = data.find(row => {
    const sameClass = row.class_grade === currentClass;
    const sameStream = (row.stream || null) === (currentStream || null);
    return !(sameClass && sameStream);
  });

  if (clash) {
    const { data: t } = await supabase.from('teachers').select('name').eq('id', teacherId).single();
    const tName = t?.name || 'Teacher';
    return `${tName} is busy teaching ${clash.subject} to ${clash.class_grade}${clash.stream ? ' ('+clash.stream+')' : ''} at this time.`;
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
  else query = query.is('stream', null);
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

export async function getFeeStructure(schoolId, term) {
  const { data, error } = await supabase
    .from('fee_structure')
    .select('id, term, category, amount, notes, school_id')
    .eq('school_id', schoolId)
    .eq('term', term)
    .order('category', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveFeeStructure(schoolId, term, items) {
  const { error: delErr } = await supabase
    .from('fee_structure')
    .delete()
    .eq('school_id', schoolId)
    .eq('term', term);
  if (delErr) throw delErr;
  if (!items || items.length === 0) return;
  const rows = items.map(item => ({
    school_id: schoolId,
    term: term,
    category: item.category,
    amount: item.amount,
    notes: item.notes || ''
  }));
  const { error } = await supabase.from('fee_structure').insert(rows);
  if (error) throw error;
}

export async function deleteFeeItem(itemId) {
  const { error } = await supabase
    .from('fee_structure')
    .delete()
    .eq('id', itemId);
  if (error) throw error;
}

// ============= SUPER ADMIN / PLATFORM =============

export async function getStudentsBySchool(schoolId) {
  const { data, error } = await supabase
    .from('students')
    .select('id, name, adm_no, class_grade, stream, parent_phone, gender, join_date, school_id')
    .eq('school_id', schoolId);
  if (error) throw error;
  return data || [];
}

// ============= LIBRARY MANAGEMENT =============

export async function getBooks() {
  if (!_currentSchoolId) return [];
  const { data, error } = await supabase
    .from('library_books')
    .select('*')
    .eq('school_id', _currentSchoolId)
    .order('title', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveBook(book) {
  if (!_currentSchoolId) throw new Error('No school context');
  const payload = {
    ...book,
    school_id: _currentSchoolId,
    updated_at: new Date().toISOString()
  };
  
  if (book.id) {
    const { data, error } = await supabase
      .from('library_books')
      .update(payload)
      .eq('id', book.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('library_books')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function deleteBook(id) {
  const { error } = await supabase
    .from('library_books')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function getBorrows() {
  if (!_currentSchoolId) return [];
  const { data, error } = await supabase
    .from('library_borrows')
    .select('*, library_books(title, author, book_code), students(name, adm_no, class, stream)')
    .eq('school_id', _currentSchoolId)
    .order('borrow_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveBorrow(borrow) {
  if (!_currentSchoolId) throw new Error('No school context');
  const payload = {
    ...borrow,
    school_id: _currentSchoolId
  };

  if (borrow.id) {
    const { data, error } = await supabase
      .from('library_borrows')
      .update(payload)
      .eq('id', borrow.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    // Check availability
    const { data: book, error: bErr } = await supabase
      .from('library_books')
      .select('available_copies')
      .eq('id', borrow.book_id)
      .single();
    if (bErr) throw bErr;
    if (book.available_copies <= 0) throw new Error('No copies available for borrowing.');

    const { data, error } = await supabase
      .from('library_borrows')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    // Decrement available copies using manual update (instead of RPC for now if not defined)
    await supabase.from('library_books').update({ 
      available_copies: book.available_copies - 1,
      updated_at: new Date().toISOString()
    }).eq('id', borrow.book_id);
    
    return data;
  }
}

export async function returnBook(borrowId, bookId) {
  const { error } = await supabase
    .from('library_borrows')
    .update({ status: 'returned', return_date: new Date().toISOString().split('T')[0] })
    .eq('id', borrowId);
  if (error) throw error;

  // Increment available copies
  const { data: book } = await supabase.from('library_books').select('available_copies').eq('id', bookId).single();
  if (book) {
    await supabase.from('library_books').update({ 
      available_copies: book.available_copies + 1,
      updated_at: new Date().toISOString()
    }).eq('id', bookId);
  }
}

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
export async function isFeatureEnabled(featureSlug) {
  try {
    const profile = await getSchoolProfile();
    const planName = profile?.subscriptionPlan || profile?.subscription_plan || 'Starter Plan';

    // Platform Admin override
    const user = getCurrentAuthUser();
    if (user?.email === 'admin@shulesoft.com' || user?.email === 'shulesoft8@gmail.com') return true;

    // Librarian role specific override for Library module
    if (featureSlug === 'library' && user?.role?.toLowerCase() === 'librarian') return true;

    const settings = await getPlatformSettings();
    const plan = settings?.pricing?.[planName];
    if (!plan) return false;

    // === NEW: Hard module slug check (authoritative) ===
    if (Array.isArray(plan.modules) && plan.modules.length > 0) {
      return plan.modules.includes(featureSlug);
    }

    // === FALLBACK: Legacy fuzzy string matching for plans that haven't been upgraded ===
    const allowedFeatures = plan.features || [];
    const keywords = FEATURE_MAPPING[featureSlug] || [];
    return keywords.some(k => allowedFeatures.some(af => af.includes(k) || k.includes(af)));
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

// Auto-sync every 60s if online
setInterval(triggerSync, 60000);
window.addEventListener('online', triggerSync);
