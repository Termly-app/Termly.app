import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bbqggxybzjxvjvkxfevb.supabase.co',
  'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3'
);

const SCHOOL_ID = '72628a28-b86e-4918-ae1b-c5c99140ddb9';

async function diagnose() {
  console.log('=== 1. TEACHERS ===');
  const { data: teachers } = await supabase.from('teachers').select('id, name, phone, user_id, subjects').eq('school_id', SCHOOL_ID);
  console.log(JSON.stringify(teachers, null, 2));

  console.log('\n=== 2. SUBJECT_ASSIGNMENTS ===');
  const { data: sa } = await supabase.from('subject_assignments').select('*').eq('school_id', SCHOOL_ID);
  console.log(JSON.stringify(sa, null, 2));

  console.log('\n=== 3. TIMETABLE_SLOTS (for this teacher) ===');
  if (teachers && teachers[0]) {
    const tid = teachers[0].id;
    const uid = teachers[0].user_id;
    console.log(`Teacher ID: ${tid}, User ID: ${uid}`);
    
    // Check with teacher_id
    const { data: slots1 } = await supabase.from('timetable_slots').select('id, day_of_week, subject, class_grade, stream, teacher_id, slot_index').eq('school_id', SCHOOL_ID).eq('teacher_id', tid);
    console.log(`Slots by teacher_id (${tid}):`, JSON.stringify(slots1, null, 2));
    
    if (uid) {
      const { data: slots2 } = await supabase.from('timetable_slots').select('id, day_of_week, subject, class_grade, stream, teacher_id, slot_index').eq('school_id', SCHOOL_ID).eq('teacher_id', uid);
      console.log(`Slots by user_id (${uid}):`, JSON.stringify(slots2, null, 2));
    }
  }

  console.log('\n=== 4. ALL TIMETABLE_SLOTS ===');
  const { data: allSlots } = await supabase.from('timetable_slots').select('id, day_of_week, subject, class_grade, stream, teacher_id, slot_index').eq('school_id', SCHOOL_ID).limit(20);
  console.log(JSON.stringify(allSlots, null, 2));

  console.log('\n=== 5. CHECK RPC EXISTENCE ===');
  const rpcs = ['portal_get_teacher_assignments', 'portal_get_timetable_config', 'portal_get_teacher_workload', 'portal_get_teacher_timetable', 'portal_get_open_exams'];
  for (const fn of rpcs) {
    const { error } = await supabase.rpc(fn, { p_school_id: SCHOOL_ID, p_teacher_id: SCHOOL_ID, p_period_id: SCHOOL_ID });
    if (error && error.message.includes('Could not find the function')) {
      console.log(`  [MISSING] ${fn}`);
    } else {
      console.log(`  [EXISTS] ${fn} ${error ? '(call error: ' + error.message.substring(0, 60) + ')' : ''}`);
    }
  }
}

diagnose();
