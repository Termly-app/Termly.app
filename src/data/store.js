import { supabase } from '../lib/supabase';
import { CBC_STRUCTURE, CBC_CORE_COMPETENCIES, TERM_FEE, getLevelForGrade, getSubjectsForGrade } from './seedData';

export { CBC_STRUCTURE, CBC_CORE_COMPETENCIES, TERM_FEE, getLevelForGrade, getSubjectsForGrade };


// ============= SaaS Subscription Tiers =============
// Consolidated into SEAT_LIMITS below


// ============= CURRENT SCHOOL CONTEXT =============
// Stored in-memory during session (set after login)
// Triggering fresh build on Vercel...
let _currentSchoolId = null;
let _currentAuthUser = null;
let _currentPeriodId = null;

export const SEAT_LIMITS = {
  Basic:   { students: 150, admins: 5,   price: 5999 },
  Standard: { students: 300, admins: 10,  price: 15000 },
  Premium: { students: 1000, admins: 30, price: 50000 },
  Starter: { students: 150, admins: 5,   price: 5999 }, // Legacy
  Fala:    { students: 150, admins: 5,   price: 5999 }, // Kenyan branding
  Champe:  { students: 1000, admins: 30, price: 50000 },
  School:  { students: 500, admins: 15,  price: 25000 },
  "Super Admin": { students: 9999, admins: 999, price: 0 }
};

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

export async function registerSchool(name, email, plan, authUserId, adminName, adminEmail, phone = '', location = '') {
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
      subscription_status: 'Inactive', // No trial, needs payment
      subscription_expiry: new Date().toISOString(),
      phone,
      address: location
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
    .select('id, name, email, plan, owner_id, phone, location, created_at, school_profiles(*)')
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
  activeClasses: Object.values(CBC_STRUCTURE).flatMap(l => l.grades),
  gradeFees: {},
  subscriptionStatus: 'Trial',
  subscriptionExpiry: null,
  lastPaymentStatus: 'none',
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

const SAFE_PROFILE_COLUMNS = 'id, school_name, motto, phone, email, address, logo, subscription_plan, streams_per_class, custom_subjects, active_classes, grade_fees, subscription_status, subscription_expiry, last_payment_status';

export async function getSchoolProfile() {
  if (!_currentSchoolId) return { ...DEFAULT_PROFILE };
  
  try {
    // Attempt to get all columns first
    const { data, error } = await supabase
      .from('school_profiles')
      .select('*')
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
  return {
    schoolName: data.school_name || DEFAULT_PROFILE.schoolName,
    motto: data.motto || '',
    phone: data.phone || '',
    email: data.email || '',
    address: data.address || '',
    logo: data.logo || '',
    subscriptionPlan: data.subscription_plan || 'Basic',
    streamsPerClass: data.streams_per_class || DEFAULT_PROFILE.streamsPerClass,
    customSubjects: data.custom_subjects || {},
    activeClasses: data.active_classes || DEFAULT_PROFILE.activeClasses,
    gradeFees: data.grade_fees || {},
    subscriptionStatus: data.subscription_status || 'Trial',
    subscriptionExpiry: data.subscription_expiry || null,
    lastPaymentStatus: data.last_payment_status || 'none',
    customExams: data.custom_exams || DEFAULT_PROFILE.customExams,
    gradingSystems: data.grading_systems || DEFAULT_PROFILE.gradingSystems,
    _dbId: data.id,
    schoolId: data.school_id,
  };
}

// ============= SUBSCRIPTIONS & PAYMENTS =============
export async function checkIsSubscriptionActive(profile) {
  if (!profile) return false;
  if (profile.subscriptionStatus === 'Deactivated' || profile.subscriptionStatus === 'Suspended') return false;

  const now = new Date();

  // 1. INDIVIDUAL FUTURE OVERRIDE - If school has an explicit future expiry, respect it above all
  if (profile.subscriptionExpiry) {
    const pExp = new Date(profile.subscriptionExpiry);
    if (!isNaN(pExp.getTime()) && pExp > now) {
      return ['Active', 'Trial'].includes(profile.subscriptionStatus);
    }
  }

  // 2. GLOBAL TERM EXPIRY - Platform-wide cutoff for schools without an individual extension
  const globalExpiry = await getGlobalTermExpiry();
  if (globalExpiry) {
    const expDate = new Date(globalExpiry);
    if (!isNaN(expDate.getTime())) {
      // Set to end of day to avoid premature cutoff
      expDate.setHours(23, 59, 59, 999);
      if (expDate < now) return false;
    }
  }

  // 3. INDIVIDUAL EXPIRE CHECK - If they have a local date and it passed
  if (profile.subscriptionExpiry) {
    const pExp = new Date(profile.subscriptionExpiry);
    if (!isNaN(pExp.getTime())) {
      pExp.setHours(23, 59, 59, 999);
      if (pExp < now) return false;
    }
  }

  // 4. Default Expiry - If both global and local dates are missing but we are past a known platform deadline, fail
  // We can hardcode or rely on the global settings which we already checked.
  
  return ['Active', 'Trial'].includes(profile.subscriptionStatus);
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
    .select('*')
    .eq('school_id', _currentSchoolId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAllPendingPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('*, school_profiles(school_name)')
    .eq('status', 'Pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAllPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('*, school_profiles(school_name, subscription_plan)')
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
    custom_subjects: profile.customSubjects || {},
    grade_fees: profile.gradeFees || {},
    custom_exams: profile.customExams || DEFAULT_PROFILE.customExams,
    grading_systems: profile.gradingSystems || DEFAULT_PROFILE.gradingSystems,
    updated_at: new Date().toISOString(),
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
    .select('*')
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
    .select('*')
    .eq('school_id', _currentSchoolId);
  if (error) throw error;
  return data || [];
}

export async function saveUsers(users) {
  // Bulk update — used by Login during registration
  for (const user of users) {
    await supabase.from('users')
      .update({ name: user.name, email: user.email, role: user.role })
      .eq('id', user.id);
  }
}

export async function addUser(user) {
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
    .select('*, schools(id, name, plan)')
    .eq('auth_user_id', authUserId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

// ============= STUDENTS =============
export async function getStudents() {
  if (!_currentSchoolId) return [];
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('school_id', _currentSchoolId);
  if (error) throw error;
  return (data || []).map(s => ({
    ...s,
    admNo: s.adm_no,
    parentPhone: s.parent_phone,
    joinDate: s.join_date,
  }));
}

export async function getStudent(id) {
  const { data, error } = await supabase.from('students').select('*').eq('id', id).single();
  if (error) throw error;
  return data ? { ...data, admNo: data.adm_no, parentPhone: data.parent_phone, joinDate: data.join_date } : null;
}

export async function addStudent(student) {
  const all = await getStudents();
  const p = await getSchoolProfile();
  const planName = p.subscriptionPlan || 'Basic';
  
  // Robust plan lookup matching other components
  const planLimits = SEAT_LIMITS[planName] || SEAT_LIMITS.Basic;
  const maxStudents = planLimits.students || planLimits.maxStudents || 150;
  
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
      parent_phone: student.parentPhone || '',
      gender: student.gender || '',
      dob: student.dob || '',
      join_date: student.joinDate || new Date().toISOString().split('T')[0],
      notes: student.notes || '',
    })
    .select()
    .single();
  if (error) throw error;

  // Create fee record for new student
  await supabase.from('fees').insert({
    school_id: _currentSchoolId,
    student_id: data.id,
    total_fee: TERM_FEE,
    paid: 0,
    balance: TERM_FEE,
  });

  await logPlatformActivity('STUDENT_ADD', `Added new student: ${student.name}`);
  return { ...data, admNo: data.adm_no, parentPhone: data.parent_phone, joinDate: data.join_date };
}

export async function updateStudent(id, updates) {
  const row = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.class !== undefined) row.class = updates.class;
  if (updates.stream !== undefined) row.stream = updates.stream;
  if (updates.parent !== undefined) row.parent = updates.parent;
  if (updates.parentPhone !== undefined) row.parent_phone = updates.parentPhone;
  if (updates.gender !== undefined) row.gender = updates.gender;
  if (updates.dob !== undefined) row.dob = updates.dob;
  if (updates.joinDate !== undefined) row.join_date = updates.joinDate;
  if (updates.notes !== undefined) row.notes = updates.notes;
  if (updates.admNo !== undefined) row.adm_no = updates.admNo;

  const { data, error } = await supabase
    .from('students')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data ? { ...data, admNo: data.adm_no, parentPhone: data.parent_phone, joinDate: data.join_date } : null;
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
    .select('*')
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
    .select('*, fee_payments(*)')
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
    const customFee = gradeFees[student.class];
    const finalFee = customFee ? Number(customFee) : TERM_FEE;
    
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
    .select('*')
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
    .select('*')
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
    .select('*')
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

// ============= TEACHERS =============
export async function getTeachers() {
  if (!_currentSchoolId) return [];
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('school_id', _currentSchoolId);
  if (error) throw error;
  return data || [];
}

export async function getTeachersBySchool(schoolId) {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
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
    .insert({ school_id: _currentSchoolId, name: teacher.name, phone: teacher.phone || '', status: teacher.status || 'Active', tsc_number: teacher.tsc_number || null })
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
    .update({ name: updates.name, phone: updates.phone, status: updates.status, tsc_number: updates.tsc_number || null })
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
}

// ============= SUBJECT ASSIGNMENTS =============
export async function getSubjectAssignments() {
  if (!_currentSchoolId || !_currentPeriodId) return {};
  const { data, error } = await supabase
    .from('subject_assignments')
    .select('*')
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
    .select('*, schools(name)')
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
      .select('*');
    
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
        "Fala":   { "price": 5999,  "active": true, "limit": 5,  "features": ["profiles", "fees", "attendance", "reports"] },
        "Champe": { "price": 50000, "active": true, "limit": 5000, "features": ["everything_starter", "cbc", "exams", "priority"] }
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
        "Fala":   { "price": 5999,  "active": true, "limit": 150,  "features": ["profiles", "fees", "attendance", "reports"] },
        "Champe": { "price": 50000, "active": true, "limit": 5000, "features": ["everything_starter", "cbc", "exams", "priority"] }
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
  
  // Fallback to Starter or some default
  plan = plan || settings.pricing["Starter"] || Object.values(settings.pricing)[0];
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
  const { error } = await supabase
    .from('schools')
    .delete()
    .eq('id', schoolId);
  if (error) throw error;
  await logPlatformActivity('SCHOOL_DELETE', `Terminated school workspace: ${schoolId}`);
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
    if (currentExpiry > expiry) expiry = currentExpiry;
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

    const totalSchools = sData.length;
    
    // Active means explicitly 'Active' or 'Trial' AND not and reached global/local expiry
    const activeSchools = prData.filter(p => {
      const pExp = p.subscription_expiry ? new Date(p.subscription_expiry) : null;
      // Individual future expiry always wins
      if (pExp && pExp > now) return ['Active', 'Trial'].includes(p.subscription_status);
      
      // Otherwise respect global
      if (isGloballyExpired) return false;
      
      return ['Active', 'Trial'].includes(p.subscription_status);
    }).length;

    const suspendedSchools = prData.filter(p => p.subscription_status === 'Suspended').length;
    const expiredSchools = prData.filter(p => {
      const pExp = p.subscription_expiry ? new Date(p.subscription_expiry) : null;
      // Individual future expiry means NOT expired
      if (pExp && pExp > now) return false;

      if (isGloballyExpired) return true;
      if (pExp && pExp < now) return true;
      return p.subscription_status === 'Expired';
    }).length;
    
    // Deactivated means anything else (e.g., 'Inactive', 'Deactivated')
    const deactivatedSchools = prData.filter(p => !['Active', 'Trial', 'Suspended', 'Expired'].includes(p.subscription_status)).length;
    
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
      activeSchools: activeSchools || 0,
      suspendedSchools: suspendedSchools || 0,
      expiredSchools: expiredSchools || 0,
      deactivatedSchools: deactivatedSchools || 0,
      revenue: totalRev,
      newSchoolsThisMonth,
      pendingPayments: pData.filter(p => p.status === 'Pending').length,
      revenueHistory,
      labels,
      health: activeSchools >= expiredSchools ? 'Healthy' : 'Critical',
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
 * Global platform subscription for Super Admins
 */
export function subscribeToPlatformChanges(onUpdate) {
  const channel = supabase
    .channel('platform_global_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'schools' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'school_profiles' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_activity' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, onUpdate)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}


// ============= TIMETABLE =============

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

// ============= FEE STRUCTURE =============

export async function getFeeStructure(schoolId, term) {
  const { data, error } = await supabase
    .from('fee_structure')
    .select('*')
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
    .select('*')
    .eq('school_id', schoolId);
  if (error) throw error;
  return data || [];
}
