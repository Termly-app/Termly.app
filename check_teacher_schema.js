import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("1. Checking academic_periods schema...");
  const { data: pData, error: pErr } = await supabase.from('academic_periods').select('*').limit(1);
  if (pErr) console.error("Periods Error:", pErr);
  else console.log("Periods columns:", pData.length > 0 ? Object.keys(pData[0]) : "No records");

  console.log("2. Checking exams schema...");
  const { data: eData, error: eErr } = await supabase.from('exams').select('*').limit(1);
  if (eErr) console.error("Exams Error:", eErr);
  else console.log("Exams columns:", eData.length > 0 ? Object.keys(eData[0]) : "No records");
}

test();
