import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbqggxybzjxvjvkxfevb.supabase.co';
const supabaseKey = 'sb_publishable_X7NtRr9PuV29pJs90ptC3A_GRNTpcC3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Listing tables in public schema...");
  const { data, error } = await supabase.rpc('get_tables_list'); // I'll hope this exists or I'll create it
  if (error) {
     console.log("RPC get_tables_list failed, trying direct select (might fail due to RLS)...");
     const { data: d2, error: e2 } = await supabase.from('pg_tables').select('tablename').eq('schemaname', 'public');
     if (e2) console.error("Direct select failed:", e2);
     else console.log("Tables:", d2);
  } else {
     console.log("Tables:", data);
  }
}

test();
