import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findUser() {
  const phone = '0712260057';
  console.log(`Searching for user with phone: ${phone}...`);
  
  const { data, error } = await supabase.from('users').select('*').ilike('phone', `%${phone}%`);
  console.log("Users Found:", data);
}

findUser();
