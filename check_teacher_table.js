import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeacherTable() {
  const phone = '0712260057';
  console.log(`Checking TEACHERS table for phone: ${phone}...`);

  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .ilike('phone', `%${phone}%`);

  if (error) {
    console.error("Teachers Error:", error);
  } else {
    console.log("Teachers found:", data);
  }
}

checkTeacherTable();
