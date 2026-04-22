import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeacherData() {
  const phone = '0712260057';
  console.log(`Checking data for teacher with phone: ${phone}...`);

  // 1. Find the user
  const { data: userData, error: userErr } = await supabase
    .from('users')
    .select('id, school_id, name, teacher_record_id')
    .eq('phone', phone)
    .single();

  if (userErr || !userData) {
    console.error("User not found or error:", userErr);
    return;
  }
  console.log("Found User:", userData);

  const teacherId = userData.teacher_record_id || userData.id;
  const schoolId = userData.school_id;

  // 2. Check Active Period
  const { data: periods, error: pErr } = await supabase
    .from('academic_periods')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_active', true);
  
  console.log("Active Periods:", periods?.length || 0);
  if (periods && periods.length > 0) {
    const periodId = periods[0].id;
    console.log("Using Period ID:", periodId);

    // 3. Check Assignments
    const { data: assignments, error: aErr } = await supabase
      .from('tt_teacher_subjects')
      .select('*, tt_subjects(name), classes(name)')
      .eq('teacher_id', teacherId)
      .eq('period_id', periodId);
    
    console.log("Assignments found in tt_teacher_subjects:", assignments?.length || 0);
    if (aErr) console.error("Assignments Error:", aErr);

    // 4. Check Timetable Slots
    const { data: slots, error: sErr } = await supabase
      .from('tt_slots')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('period_id', periodId);
    console.log("Timetable slots found in tt_slots:", slots?.length || 0);

    // 5. Check Exam Papers
    const { data: papers, error: epErr } = await supabase
      .from('exam_papers')
      .select('id')
      .eq('teacher_id', teacherId);
    console.log("Exam papers found in exam_papers:", papers?.length || 0);
  } else {
    console.log("NO ACTIVE PERIOD FOUND for this school.");
  }
}

checkTeacherData();
