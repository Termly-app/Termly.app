
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    const env = {};
    lines.forEach(line => {
      const [key, ...value] = line.split('=');
      if (key && value) {
        env[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
      }
    });
    return env;
  } catch (e) {
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function audit() {
  console.log("=== High-Precision Platform Audit ===");
  
  // 1. Schools
  const { data: schools, error: sErr } = await supabase.from('schools').select('*');
  if (sErr) { console.error("Error fetching schools:", sErr); return; }
  console.log(`Total Schools (public.schools): ${schools.length}`);

  // 2. Profiles
  const { data: profiles, error: pErr } = await supabase.from('school_profiles').select('*');
  if (pErr) { console.error("Error fetching profiles:", pErr); return; }
  console.log(`Total Profiles (public.school_profiles): ${profiles.length}`);

  // 3. Application Users (Administrators/Staff)
  const { data: appUsers, error: uErr } = await supabase.from('users').select('*');
  if (uErr) { console.error("Error fetching users:", uErr); return; }
  console.log(`Total App Users (public.users): ${appUsers.length}`);

  console.log("\n--- Integrity Report ---");

  // Schools without profiles
  const schoolsWithProfiles = new Set(profiles.map(p => p.school_id));
  const orphans = schools.filter(s => !schoolsWithProfiles.has(s.id));
  if (orphans.length > 0) {
    console.log(`[!] ${orphans.length} Schools have NO metadata profile (Won't show metrics in Super Admin):`);
    orphans.forEach(o => console.log(`    - ${o.name} [ID: ${o.id}]`));
  }

  // Users without valid schools
  const schoolIds = new Set(schools.map(s => s.id));
  const statelessUsers = appUsers.filter(u => !schoolIds.has(u.school_id));
  if (statelessUsers.length > 0) {
    console.log(`[!] ${statelessUsers.length} Users are linked to non-existent school IDs (Zombie Accounts):`);
    statelessUsers.forEach(u => console.log(`    - ${u.name} [School ID: ${u.school_id}, Email: ${u.email}]`));
  }

  // Users who are marked as Admin but have no associated school record
  // This could happen if registration failed halfway.
  
  console.log("\n--- Potential 'Hidden' School Accounts ---");
  // Check if there are any users in the 'users' table whose school_id is null or missing from 'schools'
  // But who have an email that suggests they might represent a school
  const potentialSchoolsFromUsers = appUsers.filter(u => u.role === 'Admin' && (!u.school_id || !schoolIds.has(u.school_id)));
  if (potentialSchoolsFromUsers.length > 0) {
    console.log(`[!] Found ${potentialSchoolsFromUsers.length} Admin users with broken school links:`);
    potentialSchoolsFromUsers.forEach(u => console.log(`    - ${u.name} (${u.email})`));
  } else {
    console.log("No disconnected Admin users found in public.users.");
  }

  console.log("\n=== End Audit ===");
}

audit().catch(console.error);
