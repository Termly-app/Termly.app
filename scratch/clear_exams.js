
import { supabase } from './src/lib/supabase';

async function clearExams() {
  const { data: schools } = await supabase.from('schools').select('id, name');
  console.log('Found schools:', schools);
  
  for (const school of schools) {
    console.log(`Clearing exams for ${school.name} (${school.id})...`);
    const { error } = await supabase.from('exams').delete().eq('school_id', school.id);
    if (error) console.error(`Error clearing exams for ${school.name}:`, error);
    else console.log(`Exams cleared for ${school.name}`);
    
    // Also clear custom_exams legacy field
    const { error: profError } = await supabase.from('school_profiles').update({ custom_exams: [] }).eq('school_id', school.id);
    if (profError) console.error(`Error clearing custom_exams for ${school.name}:`, profError);
  }
}

clearExams();
