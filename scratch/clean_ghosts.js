import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanGhosts() {
  console.log('Fetching all timetable slots...');
  const { data: allSlots, error } = await supabase.from('timetable_slots').select('*');
  
  if (error) {
    console.error('Error fetching slots:', error);
    return;
  }

  // Find orphans
  let orphans = [];
  
  // Group by (school, period, class, stream)
  // because slot structures exist within a specific grid matrix
  const groups = {};
  allSlots.forEach(s => {
    const key = `${s.school_id}_${s.period_id}_${s.class_grade}_${s.stream}_${s.day_of_week}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });

  for (const [key, daySlots] of Object.entries(groups)) {
    // Sort by slot_index
    daySlots.sort((a,b) => a.slot_index - b.slot_index);
    
    for (let i = 0; i < daySlots.length; i++) {
      const s = daySlots[i];
      if (s.is_double_second) {
        // Is there a slot in this day with a lower index that is_double_first?
        // Specifically, the immediate preceding non-break index?
        // Just checking if ANY preceding slot is_double_first is safe enough for cleanup.
        let hasParent = false;
        // In this group, search for the slot right before it 
        let prevSlot = null;
        if (i > 0) prevSlot = daySlots[i-1];
        
        if (prevSlot && prevSlot.is_double_first) {
          hasParent = true;
        }

        if (!hasParent) {
          console.log(`Orphan found! Grade: ${s.class_grade}, Subject: ${s.subject}, Day: ${s.day_of_week}, Slot: ${s.slot_index}`);
          orphans.push(s.id);
        }
      }
    }
  }

  if (orphans.length > 0) {
    console.log(`Found ${orphans.length} orphans. Deleting...`);
    const { error: delError } = await supabase.from('timetable_slots').delete().in('id', orphans);
    if (delError) {
      console.error('Failed to delete orphans:', delError);
    } else {
      console.log('Successfully deleted all orphans!');
    }
  } else {
    console.log('No orphans found.');
  }
}

cleanGhosts();
