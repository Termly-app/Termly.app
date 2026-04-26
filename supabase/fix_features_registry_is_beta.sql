-- Ensure is_beta column exists in features_registry
-- This fix addresses the ERROR: 42703 (column does not exist)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'features_registry' 
                   AND column_name = 'is_beta') THEN
        ALTER TABLE public.features_registry ADD COLUMN is_beta BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added column is_beta to features_registry';
    ELSE
        RAISE NOTICE 'Column is_beta already exists in features_registry';
    END IF;
END $$;

-- Reload schema for PostgREST
NOTIFY pgrst, 'reload schema';
