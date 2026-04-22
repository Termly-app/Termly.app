import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findSchoolByPhone() {
  const phone = '0712260057';
  console.log(`Searching for school with phone: ${phone}...`);
  
  const { data, error } = await supabase.from('schools').select('*').ilike('phone', `%${phone}%`);
  console.log("Schools Found:", data);
}

findSchoolByPhone();
