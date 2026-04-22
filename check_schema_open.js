const url = 'https://bbqggxybzjxvjvkxfevb.supabase.co/rest/v1/?apikey=sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const headers = {
  'Authorization': 'Bearer sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3',
};

fetch(url, { headers })
  .then(res => res.json())
  .then(data => {
    const table = data.definitions.exam_papers;
    console.log(Object.keys(table.properties));
  })
  .catch(err => console.error('ERROR:', err));
