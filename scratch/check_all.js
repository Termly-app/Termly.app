import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAll() {
  const { data, error } = await supabase.from('timetable_slots').select('*');
  console.log(data);
}

checkAll();
