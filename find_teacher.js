import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findTeacher() {
  const phone = '0712260057';
  console.log(`Searching for teacher with phone: ${phone}...`);
  
  // Try exact match
  const { data: d1, error: e1 } = await supabase.from('teachers').select('*').eq('phone', phone);
  console.log("Exact Match:", d1);

  // Try contains
  const { data: d2, error: e2 } = await supabase.from('teachers').select('*').ilike('phone', `%${phone}%`);
  console.log("Like Match:", d2);

  // Try cleaned phone
  const { data: d3, error: e3 } = await supabase.from('teachers').select('*');
  if (d3) {
    const found = d3.filter(t => t.phone.replace(/[^0-9]/g, '').includes('712260057'));
    console.log("Cleaned Filter Match:", found);
  }
}

findTeacher();
