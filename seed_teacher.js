import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedTeacherData() {
  const schoolId = '72628a28-b86e-4918-ae1b-c5c99140ddb9';
  const phone = '0712260057';
  
  console.log("Seeding teacher data for Marete School...");

  // 1. Create Teacher
  const { data: teacher, error: tErr } = await supabase.from('teachers').upsert({
    school_id: schoolId,
    name: 'Marete Test Teacher',
    phone: phone,
    pin: '1234',
    status: 'Active'
  }, { onConflict: 'phone,school_id' }).select().single();
  
  if (tErr) {
    console.warn("Teacher upsert failed (maybe no unique constraint). Trying insert...");
    const { data: t2, error: tErr2 } = await supabase.from('teachers').insert({
      school_id: schoolId,
      name: 'Marete Test Teacher',
      phone: phone,
      pin: '1234',
      status: 'Active'
    }).select().single();
    if (tErr2) console.error("Teacher Insert Error:", tErr2);
    else console.log("Teacher created:", t2.id);
  } else {
    console.log("Teacher upserted:", teacher.id);
  }

  // 2. Academic Period
  const { data: period, error: pErr } = await supabase.from('academic_periods').upsert({
    school_id: schoolId,
    year: 2026,
    term: 'Term 1',
    is_active: true
  }, { onConflict: 'school_id,year,term' }).select().single();
  
  if (pErr) console.error("Period Error:", pErr);

  // 3. Assignment
  if (teacher && period) {
    const { error: aErr } = await supabase.from('subject_assignments').insert({
      school_id: schoolId,
      class_grade: 'Grade 1',
      stream: 'A',
      subject: 'Mathematics',
      teacher_id: teacher.id,
      period_id: period.id
    });
    if (aErr) console.error("Assignment Error:", aErr);
    else console.log("Assignment created!");
  }
}

seedTeacherData();
