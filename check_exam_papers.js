import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log("Checking exam_papers columns...");
  
  // To get columns, we can just do a select with limit 1
  const { data, error } = await supabase
    .from('exam_papers')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error("Error fetching exam_papers:", error.message);
  } else {
    console.log("exam_papers data:", data);
  }
}

checkColumns();
