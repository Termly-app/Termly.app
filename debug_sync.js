const BASE = 'https://bbqggxybzjxvjvkxfevb.supabase.co/rest/v1';
const KEY = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const headers = {
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
};

async function debug() {
  console.log('=== 1. EXAMS ===');
  const exams = await (await fetch(`${BASE}/exams?select=id,name,status,school_id&limit=5`, { headers })).json();
  console.log(JSON.stringify(exams, null, 2));

  console.log('\n=== 2. EXAM_PAPERS (columns) ===');
  const papers = await (await fetch(`${BASE}/exam_papers?select=*&limit=3`, { headers })).json();
  console.log(JSON.stringify(papers, null, 2));

  console.log('\n=== 3. EXAM_MARKS (columns) ===');
  const marks = await (await fetch(`${BASE}/exam_marks?select=*&limit=3`, { headers })).json();
  console.log(JSON.stringify(marks, null, 2));

  console.log('\n=== 4. MARKS (legacy table) ===');
  const legacyMarks = await (await fetch(`${BASE}/marks?select=*&limit=3`, { headers })).json();
  console.log(JSON.stringify(legacyMarks, null, 2));

  console.log('\n=== 5. STUDENTS ===');
  const students = await (await fetch(`${BASE}/students?select=id,name,class,class_id,school_id&limit=3`, { headers })).json();
  console.log(JSON.stringify(students, null, 2));

  // Now trace the exact flow
  if (exams.length > 0) {
    const examId = exams[0].id;
    console.log(`\n=== 6. PAPERS FOR EXAM ${exams[0].name} (${examId}) ===`);
    const examPapers = await (await fetch(`${BASE}/exam_papers?select=id,subject,exam_id,class_id,teacher_id&exam_id=eq.${examId}`, { headers })).json();
    console.log(JSON.stringify(examPapers, null, 2));

    if (examPapers.length > 0) {
      const paperIds = examPapers.map(p => p.id);
      console.log(`\n=== 7. MARKS FOR THESE PAPERS ===`);
      const paperMarks = await (await fetch(`${BASE}/exam_marks?select=*&exam_paper_id=in.(${paperIds.join(',')})`, { headers })).json();
      console.log(JSON.stringify(paperMarks, null, 2));
    }
  }
}

debug().catch(console.error);
