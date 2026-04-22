import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findTeachers() {
  const schoolId = '72628a28-b86e-4918-ae1b-c5c99140ddb9';
  console.log(`Searching for teachers at school: ${schoolId}...`);
  const { data, error } = await supabase.from('teachers').select('*').eq('school_id', schoolId);
  if (error) console.error(error);
  else console.log("Teachers found:", data);

  console.log(`Searching for users at school: ${schoolId}...`);
  const { data: u, error: e } = await supabase.from('users').select('*').eq('school_id', schoolId);
  if (e) console.error(e);
  else console.log("Users found:", u);
}

findTeachers();
