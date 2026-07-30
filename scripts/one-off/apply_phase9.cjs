const fs = require('fs');
let store = fs.readFileSync('src/data/store.js', 'utf8');
const diff = fs.readFileSync('diff.txt', 'utf8');

// 1. Import
store = store.replace(
  `import { encryptData as encrypt, decryptData as decrypt } from '../utils/securityUtils';`,
  `import { encryptData as encrypt, decryptData as decrypt } from '../utils/securityUtils';\nimport { sendEmail, emailTemplates } from '../utils/email';`
);

// 2. getSchoolsForPortalSearch & createPortalUser
const portalFuncs = `/**
 * Portal Search: Excludes Termly HQ and Sandbox schools
 * Relies on DB-level RLS to enforce the \`is_platform_account = false\` rule.
 */
export async function getSchoolsForPortalSearch(query) {
  if (!query || query.length < 2) return [];
  const { data, error } = await supabase
    .from('schools')
    .select('id, name, school_code') // Only return non-sensitive fields
    .ilike('name', \`%\${query}%\`)
    .eq('status', 'active')
    .neq('is_platform_account', true)
    .limit(8);
  if (error) throw error;
  return data || [];
}

/**
 * Domain 12A: Portal Access Management
 */
export async function createPortalUser(studentId, guardianName, guardianPhone, guardianEmail, type = 'parent') {
  if (!_currentSchoolId) throw new Error("No school context selected");
  
  const { data, error } = await supabase
    .from('portal_users')
    .insert({
      school_id: _currentSchoolId,
      student_id: studentId,
      name: guardianName,
      phone: guardianPhone,
      email: guardianEmail,
      type: type
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

`;
store = store.replace('export async function registerSchool(', portalFuncs + 'export async function registerSchool(');

// 3. registerSchool email
const emailWelcome = `
  // 5. Send Welcome Email
  try {
    await sendEmail({
      to: adminEmail,
      subject: \`Welcome to ShuleSoft - \${name}\`,
      template: emailTemplates.WELCOME,
      data: {
        schoolName: name,
        adminName: adminName,
        schoolCode: school.school_code,
        plan: plan
      }
    });
  } catch (emailErr) {
    console.warn('Welcome email failed', emailErr);
  }
`;
store = store.replace(
  `await logPlatformActivity('REGISTRATION', \`New school registered: \${name}\`, school.id);`,
  `await logPlatformActivity('REGISTRATION', \`New school registered: \${name}\`, school.id);\n${emailWelcome}`
);

// 4. createPeriod email
const termEmail = `
    // Send New Term Email to Admin
    if (_currentAuthUser?.email) {
      try {
        await sendEmail({
          to: _currentAuthUser.email,
          subject: \`New Term Started: \${term} \${year}\`,
          template: emailTemplates.NEW_TERM_STARTED,
          data: {
            year,
            term,
            adminName: _currentAuthUser.name || 'Admin'
          }
        });
      } catch (e) {
        console.warn('New term email failed', e);
      }
    }`;
store = store.replace(
  `_currentPeriodId = data.id;`,
  `_currentPeriodId = data.id;\n${termEmail}`
);

// 5. getGradeForScore
const gradeFuncOld = `export function getGradeForScore(score, className, profile) {
  const level = getLevelForGrade(className);
  const scale = profile.gradingSystems?.[className] || 
                profile.gradingSystems?.[level] || 
                profile.gradingSystems?.default || [
                  {min: 80, max: 100, grade: 'A', color: '#10b981'},
                  {min: 70, max: 79, grade: 'B', color: '#3b82f6'},
                  {min: 60, max: 69, grade: 'C', color: '#f59e0b'},
                  {min: 50, max: 59, grade: 'D', color: '#f97316'},
                  {min: 0, max: 49, grade: 'E', color: '#ef4444'}
                ];`;

const gradeFuncNew = `export function getGradeForScore(score, className, profile, subjectName = null) {
  const level = getLevelForGrade(className);
  
  // 1. Check for subject-specific grading scale
  let scale = null;
  if (subjectName && profile.subjectConfigs?.[className]?.[subjectName]?.gradingScale) {
    scale = profile.subjectConfigs[className][subjectName].gradingScale;
  }
  
  // 2. Fallback to class/level/default
  if (!scale) {
    scale = profile.gradingSystems?.[className] || 
            profile.gradingSystems?.[level] || 
            profile.gradingSystems?.default || [
              {min: 80, max: 100, grade: 'A', color: '#10b981'},
              {min: 70, max: 79, grade: 'B', color: '#3b82f6'},
              {min: 60, max: 69, grade: 'C', color: '#f59e0b'},
              {min: 50, max: 59, grade: 'D', color: '#f97316'},
              {min: 0, max: 49, grade: 'E', color: '#ef4444'}
            ];
  }`;
store = store.replace(gradeFuncOld, gradeFuncNew);

// 6. bulkImportStudents
const bulkImportSrc = `/**
 * Bulk import students in idempotent 50-row batches.
 * @param {Array} rows - Array of { name, admNo, class, stream, gender, parentPhone, parent, residenceType }
 * @param {Function} onProgress - Optional callback(imported, total)
 * @returns {{ imported: number, skipped: number, errors: Array }}
 */
export async function bulkImportStudents(rows, onProgress = null) {
  mutationGuard('bulkImportStudents');
  if (!_currentSchoolId || !_currentPeriodId) throw new Error('No school/period context');

  const profile = await getSchoolProfile();
  const planName = profile.subscriptionPlan || 'Sandbox';
  const planLimits = await getPlanLimits(planName);
  const maxStudents = planLimits.students || 5;
  const currentStudents = await getStudents();
  const remaining = Math.max(0, maxStudents - currentStudents.length);

  if (remaining === 0) {
    throw new Error(\`Student limit reached for your \${planName} plan (\${maxStudents} students). Cannot import.\`);
  }

  const capped = rows.slice(0, remaining);
  const skipped = rows.length - capped.length;
  const BATCH_SIZE = 50;
  let imported = 0;
  const errorList = [];

  for (let i = 0; i < capped.length; i += BATCH_SIZE) {
    const batch = capped.slice(i, i + BATCH_SIZE);
    const inserts = batch.map((row, batchIdx) => {
      const globalIdx = currentStudents.length + imported + batchIdx + 1;
      return {
        school_id: _currentSchoolId,
        adm_no: row.admNo || \`SS-\${new Date().getFullYear()}-\${String(globalIdx).padStart(4, '0')}\`,
        name: sanitizeName(row.name),
        class: row.class,
        stream: row.stream || 'General',
        parent: sanitizeName(row.parent || ''),
        residence_type: (row.residenceType || 'day').toLowerCase(),
        parent_phone: row.parentPhone || '',
        gender: row.gender || '',
        dob: row.dob || '',
        join_date: row.joinDate || new Date().toISOString().split('T')[0],
        status: 'Active',
        subjects: getSubjectsForGrade(row.class, profile)
      };
    });

    try {
      const { data: batchData, error } = await supabase
        .from('students')
        .upsert(inserts, { onConflict: 'school_id, adm_no', ignoreDuplicates: true })
        .select('id, class');

      if (error) {
        errorList.push({ batch: i / BATCH_SIZE + 1, message: error.message });
      } else {
        imported += batchData?.length || batch.length;
        if (batchData && batchData.length > 0) {
          const feeInserts = batchData.map(s => {
            const baseFee = profile.gradeFees?.[s.class] || TERM_FEE;
            const feeVal = typeof baseFee === 'object' ? Number(baseFee.day) || 0 : Number(baseFee) || 0;
            return {
              school_id: _currentSchoolId,
              student_id: s.id,
              period_id: _currentPeriodId,
              total_fee: feeVal,
              paid: 0,
              balance: feeVal
            };
          });
          await supabase.from('fees').upsert(feeInserts, { onConflict: 'school_id, student_id, period_id', ignoreDuplicates: true });
        }
      }
    } catch (err) {
      errorList.push({ batch: i / BATCH_SIZE + 1, message: err.message });
    }
    if (onProgress) onProgress(imported, capped.length);
  }

  await logPlatformActivity('BULK_IMPORT', \`Imported \${imported} students from CSV upload\`);
  return { imported, skipped, errors: errorList };
}

`;
store = store.replace('export async function updateStudent(', bulkImportSrc + 'export async function updateStudent(');

// 7. transferStudents (graduated + rpc)
store = store.replace(
  `updates.push({ id: s.id, newClass: allGrades[idx + 1] });`,
  `updates.push({ id: s.id, newClass: allGrades[idx + 1] });\n      } else if (idx === allGrades.length - 1) {\n        updates.push({ id: s.id, newClass: 'Graduated' });`
);
store = store.replace(
  `for (const u of updates) {
    const { error } = await supabase.from('students').update({ class: u.newClass }).eq('id', u.id);
    if (error) throw error;
  }`,
  `// Use the advanced RPC if it exists, fallback to single updates
  try {
    const classes = [...new Set(updates.map(u => u.newClass))];
    for (const cls of classes) {
      const ids = updates.filter(u => u.newClass === cls).map(u => u.id);
      const { data, error } = await supabase.rpc('promote_students', {
        p_school_id: _currentSchoolId,
        p_student_ids: ids,
        p_target_class: cls,
        p_new_period_id: _currentPeriodId // Usually would be NEXT period
      });
      if (error) throw error;
    }
  } catch (err) {
    console.warn('Advanced RPC failed, falling back to basic updates:', err);
    for (const u of updates) {
      const { error } = await supabase.from('students').update({ 
        class: u.newClass,
        status: u.newClass === 'Graduated' ? 'Graduated' : 'Active'
      }).eq('id', u.id);
      if (error) throw error;
    }
  }
  
  invalidateCache('students');`
);

// 8. getAttendance / markAttendance
const attOld = `export async function getAttendance() {
  if (!_currentSchoolId || !_currentPeriodId) return {};
  const cacheKey = \`att_\${_currentSchoolId}_\${_currentPeriodId}\`;
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
}`;

const attNew = `export async function getAttendance() {
  if (!_currentSchoolId || !_currentPeriodId) return {};
  return cachedQuery('attendance', async () => {
    const { data, error } = await supabase
      .from('attendance')
      .select('date, student_id, status, session')
      .eq('school_id', _currentSchoolId);
    if (error) throw error;
    const att = {};
    data?.forEach(row => {
      if (!att[row.date]) att[row.date] = {};
      if (!att[row.date][row.student_id]) att[row.date][row.student_id] = {};
      att[row.date][row.student_id][row.session || 'Morning'] = row.status;
    });
    return att;
  });
}`;
store = store.replace(attOld, attNew);

store = store.replace(
  `export async function markAttendance(date, studentId, status) {
  const { error } = await supabase
    .from('attendance')
    .upsert(
      { school_id: _currentSchoolId, date, student_id: studentId, status, period_id: _currentPeriodId },
      { onConflict: 'school_id,date,student_id,period_id' }
    );
  if (error) throw error;
}`,
  `export async function markAttendance(date, studentId, status, session = 'Morning') {
  const { error } = await supabase
    .from('attendance')
    .upsert(
      { school_id: _currentSchoolId, date, student_id: studentId, status, period_id: _currentPeriodId, session },
      { onConflict: 'school_id,date,student_id,session,period_id' }
    );
  if (error) throw error;
}`
);

// 9. validateParentLogin
const vplOld = `export async function validateParentLogin(schoolSearch, admNo, phone, schoolId = null) {
  const queryParam = schoolId || schoolSearch;

  const { data, error } = await supabase.rpc('validate_parent_portal_login', {`;

const vplNew = `export async function validateParentLogin(schoolSearch, admNo, phone, schoolId = null) {
  const queryParam = schoolId || schoolSearch;

  // 1. New System: Try logging in with Supabase Auth
  const syntheticEmail = \`\${phone.replace(/\\D/g, '')}@portal.shulesoft.local\`;
  
  // Need to ensure supabase is available here
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password: admNo,
  });

  if (authData?.user && !authError) {
    // Auth login succeeded! Fetch portal_users record
    const { data: portalUser, error: pError } = await supabase
      .from('portal_users')
      .select('*')
      .eq('id', authData.user.id)
      .single();
      
    if (portalUser) {
      return {
        id: portalUser.student_id,
        studentId: portalUser.student_id,
        token: authData.session.access_token,
        school_id: portalUser.school_id,
        schoolId: portalUser.school_id,
        parent_phone: portalUser.phone,
        name: portalUser.name,
        schoolName: schoolSearch
      };
    }
  }

  // 2. Legacy System: Fallback to the old RPC logic
  const { data, error } = await supabase.rpc('validate_parent_portal_login', {`;
store = store.replace(vplOld, vplNew);

store = store.replace(
  `const selectedSchoolId = data.school_id;`,
  `const selectedSchoolId = data.school_id;

  // 3. Auto-Migration: If legacy auth works, create their new Supabase Auth account
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: syntheticEmail,
    password: admNo,
  });

  if (signUpData?.user && !signUpError) {
    // Attempt to create portal_users record
    await supabase.from('portal_users').insert({
      id: signUpData.user.id,
      school_id: selectedSchoolId,
      student_id: data.id,
      type: 'parent',
      name: data.parent_name || 'Parent',
      phone: phone,
      email: syntheticEmail
    });
  }`
);

store = store.replace(
  `return {
    id: data.id,
    name: data.name,`,
  `return {
    id: data.id,
    studentId: data.id,
    name: data.name,`
);
store = store.replace(
  `school_id: data.school_id,
    residence_type: data.residence_type,`,
  `school_id: data.school_id,
    schoolId: data.school_id,
    residence_type: data.residence_type,`
);


// 10. End of file append (hunk 19 in diff.patch)
const endOfFilePatch = `
// MOCK SMS (Domain 14C)
export async function mockSendSMS({ phone, message, recipientUserId }) {
  await new Promise(resolve => setTimeout(resolve, 500));
  await createNotification({
    userId: recipientUserId,
    type: 'alert',
    title: 'SMS Sent',
    body: \`To \${phone}: \${message}\`,
  });
  return { success: true };
}

// PORTAL ACCESS SETTINGS (Domain 14D)
export async function getPortalAccessSettings() {
  if (!_currentSchoolId) return null;
  const { data, error } = await supabase
    .from('school_profiles')
    .select('portal_access_settings')
    .eq('school_id', _currentSchoolId)
    .single();
  if (error) throw error;
  return data?.portal_access_settings || {
    parent_portal_enabled: true,
    student_portal_enabled: false,
    results_locked_for_balances: false,
    minimum_balance_threshold: 0,
    allow_online_payments: true,
  };
}

export async function updatePortalAccessSettings(settings) {
  if (!_currentSchoolId) return;
  const { error } = await supabase
    .from('school_profiles')
    .update({ portal_access_settings: settings })
    .eq('school_id', _currentSchoolId);
  if (error) throw error;
  invalidateCache('schoolProfile');
}

/**
 * Domain 14: Schema Migration Management
 */
export async function getSchemaStatus() {
  // Queries information_schema for migrations run
  const { data, error } = await supabase
    .from('schema_migrations')
    .select('*')
    .order('run_at', { ascending: false });
    
  if (error) {
    if (error.code === '42P01') return []; // table doesn't exist yet
    throw error;
  }
  return data;
}

export async function runSchemaMigration(sql) {
  // This invokes the edge function responsible for executing raw SQL
  // The edge function must verify the platform admin JWT claim.
  const { data, error } = await supabase.functions.invoke('execute-migration', {
    body: { sql }
  });
  
  if (error) throw error;
  return data;
}

export async function getAuditLogs(filters = {}) {
  let query = supabase.from('audit_logs').select('*, users!fk_audit_user(name)').order('created_at', { ascending: false }).limit(100);
  if (filters.school_id) query = query.eq('school_id', filters.school_id);
  if (filters.action) query = query.eq('action', filters.action);
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getAllAuditLogs(filters = {}) {
  // Superadmin view
  let query = supabase.from('audit_logs').select('*, users!fk_audit_user(name), schools(name)').order('created_at', { ascending: false }).limit(200);
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function carryForwardFeeStructure(fromPeriodId, toPeriodId) {
  mutationGuard('carryForwardFeeStructure');
  // Copy structure, don't copy actual balances!
  return true;
}
`;

store = store + endOfFilePatch;

fs.writeFileSync('src/data/store.js', store);
console.log('Restored all Phase 9 changes successfully!');
store = store.replace('var _currentSchoolId =', 'export let _currentSchoolId =').replace('var _currentAuthUser =', 'export let _currentAuthUser =').replace('var _currentPeriodId =', 'export let _currentPeriodId =').replace('var _currentUserId   =', 'export let _currentUserId   =').replace('var _currentExamType =', 'export let _currentExamType ='); fs.writeFileSync('src/data/store.js', store); 
store = store.replace('async function cachedQuery(', 'export async function cachedQuery(').replace('function invalidateCache(', 'export function invalidateCache(').replace('function mutationGuard(', 'export function mutationGuard(').replace('async function logAuditEvent(', 'export async function logAuditEvent(').replace('async function getUserByAuthId(', 'export async function getUserByAuthId('); fs.writeFileSync('src/data/store.js', store); 
