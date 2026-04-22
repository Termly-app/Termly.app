import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bbqggxybzjxvjvkxfevb.supabase.co',
  'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3'
);

const SCHOOL_ID = '72628a28-b86e-4918-ae1b-c5c99140ddb9';

async function checkAllData() {
  const tables = [
    'schools',
    'teachers',
    'subject_assignments',
    'timetable_slots',
    'classes',
    'tt_subjects'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(5);
      if (error) {
        console.log(`[ERROR] ${table}: ${error.message}`);
      } else {
        console.log(`[DATA] ${table}: ${data.length} rows found`);
        if (data.length > 0) {
          console.log(JSON.stringify(data[0], null, 2));
        }
      }
    } catch (e) {
      console.log(`[EXCEPTION] ${table}: ${e.message}`);
    }
  }
}

checkAllData();
