
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking metrics as 'anon'...");
  
  const { data: schools, error: sErr } = await supabase.from('schools').select('id, name, created_at');
  if (sErr) console.error("Schools Error:", sErr);
  else console.log(`Visible Schools: ${schools.length}`);

  const { data: profiles, error: pErr } = await supabase.from('school_profiles').select('school_id');
  if (pErr) console.error("Profiles Error:", pErr);
  else console.log(`Visible Profiles: ${profiles.length}`);

  if (schools && profiles) {
    const profIds = new Set(profiles.map(p => p.school_id));
    const orphans = schools.filter(s => !profIds.has(s.id));
    console.log(`Orphans found: ${orphans.length}`);
    orphans.forEach(o => console.log(` - ${o.name}`));
  }
}

check().catch(console.error);
