
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

async function listTables() {
  console.log("--- Listing All Public Tables ---");
  // There is no direct "list tables" method in postgrest, but we can query information_schema if enabled,
  // or more reliably, just try common legacy names or check platform_activity for clues.
  
  // Actually, we can use an RPC if we create it, but for now let's check platform_activity for mentions of schools/IDs.
  const { data: activity, error: aErr } = await supabase.from('platform_activity').select('*').limit(50);
  if (aErr) { console.error("Error fetching activity:", aErr); }
  else {
    console.log(`Found ${activity.length} activity logs.`);
    const schoolIdsInLogs = new Set(activity.map(a => a.school_id).filter(Boolean));
    console.log(`Unique School IDs mentioned in logs: ${Array.from(schoolIdsInLogs).join(', ')}`);
  }

  // Try some legacy names
  const legacyNames = ['school_settings', 'settings', 'profiles', 'admin_users', 'organizations'];
  for (const name of legacyNames) {
    const { data, error } = await supabase.from(name).select('count', { count: 'exact', head: true });
    if (!error) {
      console.log(`[FOUND TABLE] Table '${name}' exists and has records.`);
    }
  }
}

listTables().catch(console.error);
