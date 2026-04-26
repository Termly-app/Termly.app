-- Ensure users table has all expected columns and proper RLS
-- This script helps resolve 406 Not Acceptable and other data-related issues

DO $$ 
BEGIN 
    -- 1. Ensure columns exist in public.users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'auth_user_id') THEN
        ALTER TABLE public.users ADD COLUMN auth_user_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'school_id') THEN
        ALTER TABLE public.users ADD COLUMN school_id UUID REFERENCES public.schools(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_changed') THEN
        ALTER TABLE public.users ADD COLUMN password_changed BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'login_username') THEN
        ALTER TABLE public.users ADD COLUMN login_username TEXT;
    END IF;

    -- 2. Ensure RLS is enabled and policies are permissive for authenticated users
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view their own record" ON public.users;
    CREATE POLICY "Users can view their own record" ON public.users 
    FOR SELECT USING (auth.uid() = auth_user_id);

    DROP POLICY IF EXISTS "Admins can view all users in their school" ON public.users;
    CREATE POLICY "Admins can view all users in their school" ON public.users 
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM public.users WHERE auth_user_id = auth.uid() AND role = 'Admin'
        )
    );

    -- 3. Ensure schools table has proper RLS for the join
    ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Schools are viewable by authenticated users" ON public.schools;
    CREATE POLICY "Schools are viewable by authenticated users" ON public.schools 
    FOR SELECT USING (auth.role() = 'authenticated');

END $$;

-- Reload schema
NOTIFY pgrst, 'reload schema';
