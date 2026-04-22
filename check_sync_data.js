const url = 'https://bbqggxybzjxvjvkxfevb.supabase.co/rest/v1';
const headers = {
  'apikey': 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3',
  'Authorization': 'Bearer sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3',
  'Content-Type': 'application/json'
};

async function check() {
  try {
    const saRes = await fetch(`${url}/subject_assignments?select=*&limit=5`, { headers });
    const saData = await saRes.json();
    console.log("=== SUBJECT ASSIGNMENTS (First 5) ===");
    console.log(JSON.stringify(saData, null, 2));

    const clsRes = await fetch(`${url}/classes?select=*&limit=5`, { headers });
    const clsData = await clsRes.json();
    console.log("\n=== CLASSES (First 5) ===");
    console.log(JSON.stringify(clsData, null, 2));

    const subjRes = await fetch(`${url}/tt_subjects?select=*&limit=5`, { headers });
    const subjData = await subjRes.json();
    console.log("\n=== TT_SUBJECTS (First 5) ===");
    console.log(JSON.stringify(subjData, null, 2));

  } catch (err) {
    console.error(err);
  }
}

check();
