import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Checking exams table presence...");
  const { data, error } = await supabase.from('exams').select('id').limit(1);
  if (error) {
    console.error("Exams Error:", error);
  } else {
    console.log("Exams table found. Rows:", data.length);
  }
}

test();
