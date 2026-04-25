-- ============================================================
-- FIX: Bulletproof Audit Logger Trigger (V2)
-- Corrected for the 'action_type' and 'table_name' column names
-- found in the ShuleSoft production schema.
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_school_id UUID;
    v_jwt JSONB;
BEGIN
    -- Safely attempt to get JWT claims
    BEGIN
        v_jwt := COALESCE(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb);
    EXCEPTION WHEN OTHERS THEN
        v_jwt := '{}'::jsonb;
    END;

    -- Safely get school_id
    IF TG_OP = 'DELETE' THEN
        v_school_id := OLD.school_id;
    ELSE
        v_school_id := NEW.school_id;
    END IF;
    
    -- Insert into audit_logs using the correct schema column names
    INSERT INTO public.audit_logs (
        school_id, 
        actor_id, 
        action_type, 
        table_name, 
        record_id, 
        old_data, 
        new_data
    ) VALUES (
        v_school_id, 
        (v_jwt ->> 'sub')::uuid,
        TG_OP, 
        TG_TABLE_NAME, 
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END, 
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
    );
    
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-enable the trigger
ALTER TABLE public.users ENABLE TRIGGER tr_audit_users;
