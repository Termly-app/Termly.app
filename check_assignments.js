import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAssignments() {
  const { data, error } = await supabase.from('subject_assignments').select('*');
  console.log("All Subject Assignments:", data);
}

checkAssignments();
