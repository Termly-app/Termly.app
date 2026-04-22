import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function countTeachers() {
  const { count, error } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
  console.log(`Total teachers in DB: ${count}`);
  if (error) console.error(error);
}

countTeachers();
