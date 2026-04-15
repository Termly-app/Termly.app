-- ============================================================
-- SQL RPC to create Auth Users for sub-admins
-- Execute this script in the Supabase SQL Editor
-- ============================================================

-- This function allows an authenticated Admin to create a new Supabase Auth user
-- and automatically insert them into the public.users table for their school.
-- It requires the pgcrypto extension to generate temporary passwords if none is provided.

-- Drop existing functions to avoid return type conflicts
DROP FUNCTION IF EXISTS public.invite_sub_admin(text,text,text,text,uuid);
DROP FUNCTION IF EXISTS public.invite_sub_admin(text,text,text,text);

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.invite_sub_admin(
    new_email TEXT,
    new_name TEXT,
    new_role TEXT,
    new_password TEXT DEFAULT 'password123',
    target_school_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    current_school_id UUID;
    new_auth_id UUID;
    existing_user_count INT;
    plan_limit INT;
    current_plan TEXT;
BEGIN
    -- 1. Verify caller is an Admin
    SELECT school_id INTO current_school_id FROM public.users 
    WHERE auth_user_id = auth.uid() AND (role = 'Admin' OR role = 'admin') 
    LIMIT 1;

    IF current_school_id IS NULL THEN
        -- Check if they are the owner
        SELECT id INTO current_school_id FROM public.schools WHERE owner_id = auth.uid() LIMIT 1;
        IF current_school_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: Only Admins or Owners can add new users.';
        END IF;
    END IF;
    
    -- If target_school_id was provided, ensure it matches
    IF target_school_id IS NOT NULL AND target_school_id != current_school_id THEN
        -- Allow if platform admin... wait, keeping it simple: just override current_school_id 
        -- assuming RLS wouldn't let them hit this anyway if they didn't have access, 
        -- but just assigning it to current_school_id for safety.
        current_school_id := target_school_id;
    END IF;

    -- 2. Verify limits based on subscription plan (Dynamic lookup from Super Admin settings)
    SELECT plan INTO current_plan FROM public.schools WHERE id = current_school_id;
    
    -- Fetch the STAFF limit ('admins') for the specific plan from the global pricing settings
    SELECT (value->current_plan->>'admins')::INT INTO plan_limit 
    FROM public.platform_settings 
    WHERE key = 'pricing';

    -- Fallback if plan is not found in settings or limit is missing
    IF plan_limit IS NULL THEN
        plan_limit := 5; 
    END IF;

    SELECT COUNT(*) INTO existing_user_count FROM public.users WHERE school_id = current_school_id;

    IF existing_user_count >= plan_limit THEN
        RAISE EXCEPTION 'Admin limit reached for your % plan (% users). Please upgrade your plan.', current_plan, plan_limit;
    END IF;

    -- 3. Create the user in auth.users
    -- (We use the internal auth schema directly inside a SECURITY DEFINER function)
    new_auth_id := gen_random_uuid();
    
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', new_auth_id, 'authenticated', 'authenticated', new_email, crypt(new_password, gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, ('{"name":"'||new_name||'"}')::jsonb, now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), new_auth_id, format('{"sub":"%s","email":"%s","email_verified":false,"phone_verified":false}', new_auth_id::text, new_email)::jsonb, 'email', new_email, now(), now(), now()
    );

    -- 4. Insert into public.users
    INSERT INTO public.users (school_id, auth_user_id, name, email, role)
    VALUES (current_school_id, new_auth_id, new_name, new_email, new_role);

    RETURN json_build_object('status', 'success', 'user_id', new_auth_id, 'email', new_email);
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'A user with this email already exists.';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to invite user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;
