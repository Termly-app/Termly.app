const BASE = 'https://bbqggxybzjxvjvkxfevb.supabase.co/rest/v1';
const KEY = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const headers = {
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
};

async function debug() {
  const marks = await (await fetch(`${BASE}/marks?select=*&limit=1`, { headers })).json();
  console.log('MARKS COLUMNS:', Object.keys(marks[0] || {}));
}

debug().catch(console.error);
