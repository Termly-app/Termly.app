import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSubjectTables() {
  const commonNames = ['subjects', 'school_subjects', 'tt_subjects', 'academic_subjects'];
  for (const name of commonNames) {
    const { error } = await supabase.from(name).select('id').limit(1);
    if (error) {
       console.log(`[ERROR] ${name}: ${error.message} (${error.code})`);
    } else {
       console.log(`[EXISTS] ${name}`);
    }
  }
}

checkSubjectTables();
