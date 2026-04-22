import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchoolAndParents() {
  const schoolId = '72628a28-b86e-4918-ae1b-c5c99140ddb9';
  console.log(`Checking school record for: ${schoolId}...`);
  const { data: s, error: se } = await supabase.from('schools').select('*').eq('id', schoolId).single();
  console.log("School:", s);

  console.log(`Checking parents table for school: ${schoolId}...`);
  const { data: p, error: pe } = await supabase.from('students').select('parent_phone, parent_name').eq('school_id', schoolId);
  console.log("Parents info in students:", p);
}

checkSchoolAndParents();
