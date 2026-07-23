const fs = require('fs');
let code = fs.readFileSync('src/data/coreStore.js', 'utf8');

const broken = `  const studentCounts = (studentsRes.data || []).reduce((acc, curr) => {
    acc[curr.school_id] = (acc[curr.school_id] || 0) + 1;
    return acc;
  }, {});
    .update({ expires_at: pastDate })
    .eq('school_id', schoolId);`;

const fix = `  const studentCounts = (studentsRes.data || []).reduce((acc, curr) => {
    acc[curr.school_id] = (acc[curr.school_id] || 0) + 1;
    return acc;
  }, {});

  const staffCounts = (staffRes.data || []).reduce((acc, curr) => {
    acc[curr.school_id] = (acc[curr.school_id] || 0) + 1;
    return acc;
  }, {});

  const featureCounts = (featuresRes.data || []).reduce((acc, curr) => {
    acc[curr.school_id] = (acc[curr.school_id] || 0) + 1;
    return acc;
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
  
  const { error: e1 } = await supabase
    .from('school_profiles')
    .update({ 
      subscription_status: 'Deactivated', 
      subscription_expiry: pastDate,
      status_notes: reason 
    })
    .eq('school_id', schoolId);
  if (e1) throw e1;

  const { error: e2 } = await supabase
    .from('school_features')
    .update({ expires_at: pastDate })
    .eq('school_id', schoolId);`;

if (code.includes(broken)) {
  code = code.replace(broken, fix);
  fs.writeFileSync('src/data/coreStore.js', code);
  console.log("Fixed syntax successfully");
} else {
  console.log("Could not find the broken block!");
}
