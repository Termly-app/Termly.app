const fs = require('fs');

let content = fs.readFileSync('src/data/coreStore.js', 'utf8');

const rest = `export function subscribeToSchoolChanges(onSettingsChange, onProfileChange) {
  if (!_currentSchoolId) return () => {};

  const channel = supabase
    .channel(\`school_shell_\${_currentSchoolId}\`)
    // Platform-wide settings (pricing, plans, features)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, () => {
      onSettingsChange();
    })
    // This school's profile (plan, name, status)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'school_profiles',
      filter: \`school_id=eq.\${_currentSchoolId}\`
    }, () => {
      onProfileChange();
    })
    // School features
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'school_features',
      filter: \`school_id=eq.\${_currentSchoolId}\`
    }, (payload) => {
      console.log("[REALTIME] Feature changed:", payload.new);
      invalidateFeatureCache(_currentSchoolId);
      onSettingsChange();
    })
    // Students added/removed (for sidebar counts, etc.)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'students',
      filter: \`school_id=eq.\${_currentSchoolId}\`
    }, () => {
      window.dispatchEvent(new Event('studentsSynced'));
    })
    // Payments / M-Pesa callbacks
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
    enabledModules: data.enabled_modules || {}
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
    if (profile.enabledModules?.[featureSlug] === false) {
      return false;
    }
    return await checkFeatureAccess(featureSlug, profile);
  } catch (e) {
    console.error("Feature gating error:", e);
    return false;
  }
}

// ============= DATA OPERATIONS =============

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

  // Encrypt sensitive fields
  const encryptIfNew = async (val, oldEncrypted) => {
    if (!val) return null;
    if (val.includes('...********')) return oldEncrypted;
    return val; // In production, encrypt here
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

  await attemptSave(row);
  _profileCache = null;
  window.dispatchEvent(new Event('schoolProfileChanged'));
  return { success: true, skipped: skippedColumns };
}

export async function resetAllData() {
  if (!_currentSchoolId) return;
  await supabase.from('teacher_assignments').delete().eq('school_id', _currentSchoolId);
  await supabase.from('class_streams').delete().eq('school_id', _currentSchoolId);
  await supabase.from('subject_assignments').delete().eq('school_id', _currentSchoolId);
  await supabase.from('core_competencies').delete().eq('school_id', _currentSchoolId);
  await supabase.from('cbc_assessments').delete().eq('school_id', _currentSchoolId);
  await supabase.from('attendance').delete().eq('school_id', _currentSchoolId);
  await supabase.from('marks').delete().eq('school_id', _currentSchoolId);
  await supabase.from('fees').delete().eq('school_id', _currentSchoolId);
  await supabase.from('students').delete().eq('school_id', _currentSchoolId);
  await supabase.from('teachers').delete().eq('school_id', _currentSchoolId);
}

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
  link.setAttribute("download", \`Termly_backup_\${new Date().toISOString().split('T')[0]}.json\`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function importData(jsonDataStr) {
  throw new Error('Import is not yet supported on the cloud version. Please contact support.');
}

// ============= PLATFORM ADMIN FUNCTIONS =============

export async function getPlatformAdmins() {
  const { data, error } = await supabase
    .from('platform_admins')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addPlatformAdmin(email, role = 'admin') {
  mutationGuard('addPlatformAdmin');
  const { error } = await supabase
    .from('platform_admins')
    .insert({ email, role });
  if (error) throw error;
  await logPlatformActivity('PLATFORM_ADMIN_ADDED', \`Added new platform admin: \${email}\`);
}

export async function removePlatformAdmin(email) {
  mutationGuard('removePlatformAdmin');
  const { error } = await supabase
    .from('platform_admins')
    .delete()
    .eq('email', email);
  if (error) throw error;
  await logPlatformActivity('PLATFORM_ADMIN_REMOVED', \`Removed platform admin: \${email}\`);
}

export async function getPlatformActivities(limit = 50) {
  const { data, error } = await supabase
    .from('platform_activity')
    .select('id, type, description, actor_email, created_at, schools(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getGlobalAuditLogs(limit = 100) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, schools(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
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
  const { data, error } = await supabase
    .from('schools')
    .select('id, name, school_code, location, school_type, publicly_listed')
    .eq('school_code', code)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPortalActivity(limit = 10) {
  const { data, error } = await supabase
    .from('portal_activity_log')
    .select('*')
    .eq('school_id', _currentSchoolId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data.map(item => ({
    ...item,
    date: new Date(item.created_at).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }));
}

export async function logPortalActivity(action, targetType, metadata = {}) {
  try {
    const { error } = await supabase.from('portal_logs').insert({ 
      school_id: _currentSchoolId, 
      action, 
      target_type: targetType, 
      metadata 
    });
    if (error) console.warn('logPortalActivity error:', error);
  } catch (e) {
    console.warn('logPortalActivity exception:', e);
  }
}

// ALIASES
export const getPlatformSchoolProfiles = getAllSchools;
export const getPlatformUsageStats = getPlatformStats;
\n`;

if (!content.includes('export function subscribeToSchoolChanges')) {
  fs.writeFileSync('src/data/coreStore.js', content + '\\n' + rest);
  console.log('Appended missing functions to coreStore.js successfully');
} else {
  console.log('subscribeToSchoolChanges already exists, doing nothing.');
}
