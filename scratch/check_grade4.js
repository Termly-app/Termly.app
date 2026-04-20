import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkGrade4() {
  const { data, error } = await supabase.from('timetable_slots').select('*').eq('class_grade', 'Grade 4').eq('day_of_week', 'Tuesday');
  console.log(data);
}

checkGrade4();
