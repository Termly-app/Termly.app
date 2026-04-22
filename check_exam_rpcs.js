import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExamRPCs() {
  const functions = ['portal_get_exam_marks', 'portal_save_exam_marks'];
  for (const fn of functions) {
    try {
      const { data, error } = await supabase.rpc(fn, { 
        p_school_id: '72628a28-b86e-4918-ae1b-c5c99140ddb9',
        p_paper_id: '72628a28-b86e-4918-ae1b-c5c99140ddb9', // dummy
        p_marks: [] // dummy
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

checkExamRPCs();
