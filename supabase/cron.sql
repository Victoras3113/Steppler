-- "Order open for 30 minutes" alert for admins. Run AFTER the Edge Functions are deployed.
-- Replace YOUR-PROJECT-REF and YOUR-CRON-SECRET (same value as the CRON_SECRET GitHub secret), then run in the SQL Editor.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'overdue-orders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/overdue-orders',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "YOUR-CRON-SECRET"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
