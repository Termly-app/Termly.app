const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://bbqggxybzjxvjvkxfevb.supabase.co', 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3');

async function test() {
  const { data: teachers, error } = await supabase.from('teachers').select('id, name, phone, school_id');
  console.log('All Teachers:', teachers);
  console.log('Error:', error);
}

test();
