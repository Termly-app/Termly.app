-- Run this in the Supabase SQL Editor
-- This will list EVERY link pointing to auth.users across the entire database.
-- Look closely at the "constraint_definition" column for any that DO NOT end in "ON DELETE CASCADE" or "ON DELETE SET NULL".

SELECT 
    n1.nspname AS referencing_schema, 
    t1.relname AS referencing_table, 
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class t1 ON t1.oid = con.conrelid
JOIN pg_namespace n1 ON n1.oid = t1.relnamespace
JOIN pg_class t2 ON t2.oid = con.confrelid
JOIN pg_namespace n2 ON n2.oid = t2.relnamespace
WHERE con.contype = 'f'
  AND n2.nspname = 'auth' 
  AND t2.relname = 'users'
ORDER BY n1.nspname, t1.relname;
