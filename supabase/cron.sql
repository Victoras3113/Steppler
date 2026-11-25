-- "Order open for 30 minutes" alert for admins. Run AFTER schema.sql and after the first successful deploy.
-- Replace iwnzhjtfsmgsmejrzzqo with your project ref, then run in the SQL Editor.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'overdue-orders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://iwnzhjtfsmgsmejrzzqo.supabase.co/functions/v1/overdue-orders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from public.app_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
