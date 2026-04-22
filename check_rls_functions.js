import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSFunctions() {
  const functions = ['get_auth_school_id', 'is_school_owner', 'is_school_admin'];
  for (const fn of functions) {
    try {
      const { data, error } = await supabase.rpc(fn, { 
        p_school_id: '72628a28-b86e-4918-ae1b-c5c99140ddb9' // dummy
      });
      if (error && error.message.includes('does not exist')) {
        console.log(`[MISSING] Function ${fn}`);
      } else {
        console.log(`[EXISTS] Function ${fn}`);
      }
    } catch (e) {
      console.log(`[ERROR] Function ${fn}: ${e.message}`);
    }
  }
}

checkRLSFunctions();
