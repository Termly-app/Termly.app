import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const tables = ['subject_assignments', 'tt_teacher_subjects', 'tt_slots', 'timetable_slots'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error && error.message.includes('does not exist')) {
      console.log(`[MISSING] Table ${t}`);
    } else {
      console.log(`[EXISTS] Table ${t}`);
      if (data && data.length > 0) console.log(`Sample from ${t}:`, data[0]);
    }
  }
}

checkSchema();
