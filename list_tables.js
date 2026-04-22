import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  const { data, error } = await supabase.rpc('get_table_names'); // If I created this
  if (error) {
    // Fallback: try to query information_schema if possible, but usually rpc is better
    console.log("Could not list tables via RPC. Trying query...");
    const { data: d, error: e } = await supabase.from('schools').select('id').limit(1);
    if (e) console.error("Query Error:", e);
    else console.log("Connection OK, but need to find table names.");
  } else {
    console.log("Tables:", data);
  }
}

// Alternative: check the migration files to see what tables I created
listTables();
