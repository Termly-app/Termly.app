const url = 'https://bbqggxybzjxvjvkxfevb.supabase.co/rest/v1/exam_papers?limit=1';
const headers = {
  'apikey': 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3',
  'Authorization': 'Bearer sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3',
};

fetch(url, { headers })
  .then(res => res.json())
  .then(data => console.log('DATA:', data))
  .catch(err => console.error('ERROR:', err));
