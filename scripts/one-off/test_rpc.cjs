const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://bbqggxybzjxvjvkxfevb.supabase.co', 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3');

async function testRPC() {
  console.log('Testing Staff Login RPC...');
  const { data: staffData, error: staffErr } = await supabase.rpc('validate_staff_portal_login', {
    p_school_search: 'Marete School',
    p_phone: '0712260057',
    p_pin: '1234'
  });
  console.log('Staff result:', staffData, staffErr);

  console.log('Testing Parent Login RPC...');
  const { data: parentData, error: parentErr } = await supabase.rpc('validate_parent_portal_login', {
    p_school_search: 'Marete School',
    p_adm_no: '001',
    p_phone: '0712260057'
  });
  console.log('Parent result:', parentData, parentErr);
}

testRPC();
