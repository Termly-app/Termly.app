import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOpenExams() {
  const { data, error } = await supabase.rpc('portal_get_open_exams', { p_school_id: '72628a28-b86e-4918-ae1b-c5c99140ddb9' });
  if (error && error.message.includes('does not exist')) {
    console.log(`[MISSING] portal_get_open_exams`);
  } else {
    console.log(`[EXISTS] portal_get_open_exams`);
  }
}

checkOpenExams();
