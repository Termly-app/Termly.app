import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('fees').select('*').limit(1);
  if (error) console.error("Error:", error);
  else console.log("Fees columns:", data.length > 0 ? Object.keys(data[0]) : "No fee records found");
  
  const { data: stData, error: stErr } = await supabase.from('students').select('*').limit(1);
  if (stErr) console.error("Error:", stErr);
  else console.log("Students columns:", stData.length > 0 ? Object.keys(stData[0]) : "No student records found");
}

test();
