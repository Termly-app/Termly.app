import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllTables() {
  const tables = [
    'schools', 'school_profiles', 'users', 'students', 'teachers', 'classes', 
    'academic_periods', 'marks', 'fees', 'fee_payments', 'attendance', 
    'cbc_assessments', 'core_competencies', 'subject_assignments', 'exams', 
    'exam_papers', 'exam_marks', 'timetable_slots', 'timetable_rooms', 
    'timetable_configs', 'tt_periods', 'tt_subjects', 'tt_teacher_subjects', 
    'tt_teacher_availability', 'tt_slots', 'tt_weekly_targets', 'el_assignments', 
    'el_submissions', 'announcements', 'messages', 'notifications', 
    'mpesa_callbacks', 'sms_messages'
  ];
  
  const results = { exists: [], missing: [] };
  
  for (const t of tables) {
    const { error } = await supabase.from(t).select('id').limit(1);
    if (error && (error.code === 'PGRST204' || error.code === 'PGRST205' || error.message.includes('does not exist'))) {
       results.missing.push(t);
    } else {
       results.exists.push(t);
    }
  }
  
  console.log(JSON.stringify(results, null, 2));
}

checkAllTables();
