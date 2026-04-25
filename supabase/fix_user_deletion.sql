-- ============================================================
-- FIX: Allow Deletion of Users from Supabase Auth (V3)
-- Uses pg_constraint to reliably find and drop restrictive 
-- constraints bypassing information_schema permission limits.
-- ============================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- 1. Fix public.users (auth_user_id)
    -- Find and drop ANY existing constraint from public.users to auth.users
    FOR r IN (
        SELECT con.conname AS constraint_name
        FROM pg_constraint con
        JOIN pg_class t1 ON t1.oid = con.conrelid
        JOIN pg_namespace n1 ON n1.oid = t1.relnamespace
        JOIN pg_class t2 ON t2.oid = con.confrelid
        JOIN pg_namespace n2 ON n2.oid = t2.relnamespace
        WHERE n1.nspname = 'public' 
          AND t1.relname = 'users' 
          AND con.contype = 'f'
          AND n2.nspname = 'auth' 
          AND t2.relname = 'users'
    ) LOOP
        EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', r.constraint_name);
    END LOOP;
    
    -- Add the safe constraint back
    ALTER TABLE public.users 
    ADD CONSTRAINT users_auth_user_id_fkey_safe 
    FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


    -- 2. Fix public.schools (owner_id)
    FOR r IN (
        SELECT con.conname AS constraint_name
        FROM pg_constraint con
        JOIN pg_class t1 ON t1.oid = con.conrelid
        JOIN pg_namespace n1 ON n1.oid = t1.relnamespace
        JOIN pg_class t2 ON t2.oid = con.confrelid
        JOIN pg_namespace n2 ON n2.oid = t2.relnamespace
        WHERE n1.nspname = 'public' 
          AND t1.relname = 'schools' 
          AND con.contype = 'f'
          AND n2.nspname = 'auth' 
          AND t2.relname = 'users'
    ) LOOP
        EXECUTE format('ALTER TABLE public.schools DROP CONSTRAINT %I', r.constraint_name);
    END LOOP;
    
    ALTER TABLE public.schools 
    ADD CONSTRAINT schools_owner_id_fkey_safe 
    FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;


    -- 3. Fix Feature Toggles (if applicable)
    IF EXISTS (SELECT 1 FROM pg_class t JOIN pg_namespace n ON n.oid = t.relnamespace WHERE n.nspname = 'public' AND t.relname = 'feature_toggles') THEN
        FOR r IN (
            SELECT con.conname AS constraint_name
            FROM pg_constraint con
            JOIN pg_class t1 ON t1.oid = con.conrelid
            JOIN pg_namespace n1 ON n1.oid = t1.relnamespace
            JOIN pg_class t2 ON t2.oid = con.confrelid
            JOIN pg_namespace n2 ON n2.oid = t2.relnamespace
            WHERE n1.nspname = 'public' 
              AND t1.relname = 'feature_toggles' 
              AND con.contype = 'f'
              AND n2.nspname = 'auth' 
              AND t2.relname = 'users'
        ) LOOP
            EXECUTE format('ALTER TABLE public.feature_toggles DROP CONSTRAINT %I', r.constraint_name);
        END LOOP;
        
        ALTER TABLE public.feature_toggles ADD CONSTRAINT feature_toggles_enabled_by_safe FOREIGN KEY (enabled_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- 4. Fix Feature Toggle Logs (if applicable)
    IF EXISTS (SELECT 1 FROM pg_class t JOIN pg_namespace n ON n.oid = t.relnamespace WHERE n.nspname = 'public' AND t.relname = 'feature_toggle_logs') THEN
        FOR r IN (
            SELECT con.conname AS constraint_name
            FROM pg_constraint con
            JOIN pg_class t1 ON t1.oid = con.conrelid
            JOIN pg_namespace n1 ON n1.oid = t1.relnamespace
            JOIN pg_class t2 ON t2.oid = con.confrelid
            JOIN pg_namespace n2 ON n2.oid = t2.relnamespace
            WHERE n1.nspname = 'public' 
              AND t1.relname = 'feature_toggle_logs' 
              AND con.contype = 'f'
              AND n2.nspname = 'auth' 
              AND t2.relname = 'users'
        ) LOOP
            EXECUTE format('ALTER TABLE public.feature_toggle_logs DROP CONSTRAINT %I', r.constraint_name);
        END LOOP;
        
        ALTER TABLE public.feature_toggle_logs ADD CONSTRAINT feature_toggle_logs_performed_by_safe FOREIGN KEY (performed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

END $$;
