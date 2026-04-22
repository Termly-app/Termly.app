const url = 'https://bbqggxybzjxvjvkxfevb.supabase.co/rest/v1/exam_papers';
const headers = {
  'apikey': 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3',
  'Authorization': 'Bearer sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3',
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

fetch(url, { 
  method: 'POST', 
  headers, 
  body: JSON.stringify({ this_column_does_not_exist: 1 }) 
})
  .then(res => res.json())
  .then(data => console.log('DATA:', data))
  .catch(err => console.error('ERROR:', err));
