-- ============================================================
-- 20260731_schedule_subscription_expiry_reminder.sql
--
-- subscription-expiry-reminder exists and presumably works fine
-- when invoked directly, but nothing was ever set up to actually
-- call it. This schedules it daily via pg_cron + pg_net.
--
-- The service role key is deliberately NOT in this file. Hardcoding
-- it in a migration means it ends up in version control in plain
-- text — store it in Supabase Vault instead, read at call time.
-- Every other edge function in this repo (mpesa-stk-push, mpesa-
-- callback, validate-shadow-session, admin-register-school) reads
-- SUPABASE_SERVICE_ROLE_KEY the same way — this keeps the cron job
-- consistent with that instead of introducing a different pattern.
--
-- ONE-TIME SETUP, run manually before this migration (values are
-- real secrets — don't commit these two lines anywhere, run them
-- directly in the SQL editor and discard):
--
--   select vault.create_secret('<your-service-role-key>', 'service_role_key');
--   select vault.create_secret('https://<your-project-ref>.supabase.co', 'project_url');
--
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'subscription-expiry-reminder-daily',
  '0 8 * * *', -- 08:00 UTC daily — adjust if you want this in Nairobi local time (UTC+3), i.e. '0 5 * * *' for 8am EAT
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/subscription-expiry-reminder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verify it's actually scheduled:
--   SELECT * FROM cron.job WHERE jobname = 'subscription-expiry-reminder-daily';
-- Check whether it's actually running (after the first 8am has passed):
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;

-- To remove later, if needed:
--   SELECT cron.unschedule('subscription-expiry-reminder-daily');
