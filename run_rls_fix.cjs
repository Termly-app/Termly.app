const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = fs.readFileSync('supabase/fix_portal_access_rls.sql', 'utf8');
  console.log('Applying RLS fix for portal_access_settings...');
  const { data, error } = await supabase.functions.invoke('execute-migration', {
    body: { sql }
  });
  console.log('Result:', data);
  if (error) console.error('Error:', error);
}

run();
