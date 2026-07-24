const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: schools, error: sErr } = await supabase
    .from('schools')
    .select('id, name')
    .ilike('name', '%Marete%');
    
  console.log('Schools:', schools);

  if (schools && schools.length > 0) {
    const schoolIds = schools.map(s => s.id);
    const { data: teachers, error: tErr } = await supabase
      .from('teachers')
      .select('id, name, phone, school_id')
      .in('school_id', schoolIds);
      
    console.log('Teachers in these schools:', teachers);
    
    // Test the specific phone
    const { data: t2, error: e2 } = await supabase
      .from('teachers')
      .select('id, name, phone, school_id')
      .eq('phone', '0712260057')
      .in('school_id', schoolIds);
      
    console.log('Specific teacher:', t2, e2);
  }
}

test();
