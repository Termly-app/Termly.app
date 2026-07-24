import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("1. Validating login (calling validate_parent_portal_login)...");
  const { data: loginData, error: loginErr } = await supabase.rpc('validate_parent_portal_login', {
    p_school_search: 'marete',
    p_adm_no: '11630',
    p_phone: '1234567890'
  });

  if (loginErr) {
    console.error("Login Error:", loginErr);
    return;
  }
  console.log("Login Data:", loginData);

  if (loginData && loginData.id) {
    const studentId = loginData.id;
    console.log("\n2. Fetching student profile (portal_get_student_profile)...");
    const { data: profileData, error: profileErr } = await supabase.rpc('portal_get_student_profile', { p_student_id: studentId });
    console.log("Profile Data:", profileData);
    console.log("Profile Error:", profileErr);

    console.log("\n3. Fetching fees (portal_get_student_fees)...");
    const { data: feeData, error: feeErr } = await supabase.rpc('portal_get_student_fees', { p_student_id: studentId });
    console.log("Fee Data:", feeData);
    console.log("Fee Error:", feeErr);

    console.log("\n4. Fetching payments (portal_get_student_payments)...");
    const { data: payData, error: payErr } = await supabase.rpc('portal_get_student_payments', { p_student_id: studentId });
    console.log("Payment Data:", payData);
    console.log("Payment Error:", payErr);
  }
}

test();
