const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient('https://bbqggxybzjxvjvkxfevb.supabase.co', 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3');

async function run() {
  const sql = fs.readFileSync('supabase/migrations/20260429_portal_get_open_exams.sql', 'utf8');
  console.log('Running SQL via edge function...');
  const { data, error } = await supabase.functions.invoke('execute-migration', {
    body: { sql }
  });
  console.log('Result:', data);
  if (error) console.error('Error:', error);
}

run();
