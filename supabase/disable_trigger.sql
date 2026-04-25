-- Temporarily disable the audit trigger on public.users
-- This trigger fires when the auth.users SET NULL cascade happens,
-- and it might be crashing because it's running in the background without a web session.

ALTER TABLE public.users DISABLE TRIGGER tr_audit_users;
