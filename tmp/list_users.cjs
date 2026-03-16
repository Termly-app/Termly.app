
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

supabase.from('users').select('*').then(({data, error}) => {
  if (error) {
    console.error("Users Error:", error);
  } else {
    console.log("Users in public.users:");
    console.log(JSON.stringify(data, null, 2));
  }
});
