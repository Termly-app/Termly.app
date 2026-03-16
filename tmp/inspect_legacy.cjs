
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

async function inspectLegacy() {
  console.log("=== Legacy Data Inspection ===");
  
  const tables = ['school_settings', 'settings', 'profiles', 'admin_users', 'organizations'];
  
  for (const table of tables) {
    console.log(`\n--- Inspecting Table: ${table} ---`);
    const { data, error } = await supabase.from(table).select('*').limit(10);
    if (error) {
      console.error(`Error reading ${table}:`, error.message);
      continue;
    }
    
    if (data.length === 0) {
      console.log(`Table ${table} is empty.`);
    } else {
      console.log(`Found ${data.length} records (preview):`);
      data.forEach((row, i) => {
        console.log(`[${i}] ${JSON.stringify(row).substring(0, 200)}${JSON.stringify(row).length > 200 ? '...' : ''}`);
      });
    }
  }
}

inspectLegacy().catch(console.error);
