import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFunctions() {
  const functions = [
    'portal_get_teacher_workload',
    'portal_get_teacher_timetable',
    'portal_get_teacher_assignments',
    'portal_get_exams',
    'portal_get_periods',
    'portal_get_school_profile'
  ];

  for (const fn of functions) {
    try {
      const { data, error } = await supabase.rpc(fn, { 
        p_school_id: '72628a28-b86e-4918-ae1b-c5c99140ddb9',
        p_period_id: '72628a28-b86e-4918-ae1b-c5c99140ddb9', // dummy
        p_teacher_id: '72628a28-b86e-4918-ae1b-c5c99140ddb9' // dummy
      });
      if (error && error.message.includes('does not exist')) {
        console.log(`[MISSING] ${fn}`);
      } else {
        console.log(`[EXISTS] ${fn}`);
      }
    } catch (e) {
      console.log(`[ERROR] ${fn}: ${e.message}`);
    }
  }
}

checkFunctions();
