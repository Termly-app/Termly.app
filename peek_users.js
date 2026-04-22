import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function peekUsers() {
  console.log("Peeking at all users...");
  const { data, error } = await supabase.from('users').select('id, phone, name, role, school_id').limit(10);
  if (error) console.error(error);
  else console.log("Users Peek:", data);
}

peekUsers();
