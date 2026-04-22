import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables'); // Fallback if rpc exists
  if (error) {
    console.log("RPC get_tables failed. Trying manual query...");
    const { data: tables, error: err2 } = await supabase.from('school_profiles').select('*').limit(1); // just to check connection
    // We can't easily list tables via anon key without a custom RPC.
    // I'll check common names.
  }
}

async function checkSubjectTables() {
  const commonNames = ['subjects', 'school_subjects', 'tt_subjects', 'academic_subjects'];
  for (const name of commonNames) {
    const { error } = await supabase.from(name).select('id').limit(1);
    if (error && error.message.includes('does not exist')) {
       console.log(`[MISSING] ${name}`);
    } else {
       console.log(`[EXISTS] ${name}`);
    }
  }
}

checkSubjectTables();
