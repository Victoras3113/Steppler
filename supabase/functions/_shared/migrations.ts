// Database migrations (see also supabase/schema.sql for the base schema), applied in order by the db-migrate Edge Function during each deploy.
// Each migration runs once (tracked in public.schema_migrations) inside a transaction.
// Keep every migration idempotent where possible; never edit one that has already been applied — add a new one.

export const migrations: { name: string; sql: string }[] = [
  {
    name: "2026-11-26_security_hardening",
    sql: `
-- 1) Every new account (except the very first = main account) must be approved before it can do anything.
--    Driver requests can be approved by any admin; admin requests only by the main account. Declined = account deleted.
alter table public.admin_requests add column if not exists requested_role public.app_role not null default 'admin';

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $fn$
declare _name text := left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email,'@',1)), 100);
begin
  insert into public.profiles(id, display_name) values (new.id, _name);
  if not exists (select 1 from public.app_owner) then
    insert into public.app_owner(user_id) values (new.id);
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  else
    insert into public.admin_requests(user_id, display_name, email, requested_role)
    values (new.id, _name, coalesce(new.email, ''),
            case when new.raw_user_meta_data->>'requested_role' = 'admin' then 'admin'::public.app_role else 'driver'::public.app_role end);
  end if;
  return new;
end $fn$;

create or replace function public.decide_admin_request(_user_id uuid, _approve boolean)
returns boolean language plpgsql security definer set search_path = public
as $fn$
declare _role public.app_role;
begin
  select requested_role into _role from public.admin_requests where user_id = _user_id;
  if not found then return false; end if;
  if _role = 'admin' and not exists (select 1 from public.app_owner where user_id = auth.uid()) then
    raise exception 'Only the main account can approve administrators';
  end if;
  if _role = 'driver' and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only administrators can approve drivers';
  end if;
  delete from public.admin_requests where user_id = _user_id;
  if _approve then
    insert into public.user_roles(user_id, role) values (_user_id, _role) on conflict do nothing;
  else
    delete from public.push_subscriptions where user_id = _user_id;
    delete from public.status_events where user_id = _user_id;
    delete from auth.users where id = _user_id;
  end if;
  return true;
end $fn$;
revoke execute on function public.decide_admin_request(uuid, boolean) from public, anon;
grant execute on function public.decide_admin_request(uuid, boolean) to authenticated;

drop policy if exists "own or admin reads" on public.admin_requests;
drop policy if exists "own or owner reads" on public.admin_requests;
drop policy if exists "requests visible to approvers" on public.admin_requests;
create policy "requests visible to approvers" on public.admin_requests for select to authenticated
  using (user_id = auth.uid()
      or exists (select 1 from public.app_owner o where o.user_id = auth.uid())
      or (requested_role = 'driver' and public.has_role(auth.uid(), 'admin')));

-- 2) Logged-out visitors (anon) get no access at all to app tables or functions.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.log_status_change() from public, anon, authenticated;
revoke execute on function public.list_admin_ids() from public, anon;

-- 3) Users may only change their own name and status (nothing else on their profile).
revoke update on public.profiles from authenticated;
grant update (display_name, status, updated_at) on public.profiles to authenticated;

-- 4) Size limits so nobody can store huge texts.
alter table public.profiles drop constraint if exists profiles_display_name_len;
alter table public.profiles add constraint profiles_display_name_len check (char_length(display_name) <= 100);
alter table public.orders drop constraint if exists orders_details_len;
alter table public.orders add constraint orders_details_len check (char_length(details) between 1 and 5000) not valid;
alter table public.customers drop constraint if exists customers_name_len;
alter table public.customers add constraint customers_name_len check (char_length(name) between 1 and 200) not valid;

-- 5) Photos: max 10 per order and only <order id>/<number>.jpg names, so storage can't be flooded.
create or replace function public.order_photo_count(_order_id text)
returns bigint language sql stable security definer set search_path = public, storage
as $fn$ select count(*) from storage.objects where bucket_id = 'order-photos' and (storage.foldername(name))[1] = _order_id $fn$;
revoke execute on function public.order_photo_count(text) from public, anon;
grant execute on function public.order_photo_count(text) to authenticated;
drop policy if exists "driver uploads photos for own open order" on storage.objects;
create policy "driver uploads photos for own open order" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'order-photos'
    and name ~ '^[0-9a-f-]{36}/[0-9]{10,16}\\.jpg$'
    and exists (select 1 from public.orders o
                where o.id::text = (storage.foldername(name))[1] and o.accepted_by = auth.uid() and o.status = 'accepted')
    and public.order_photo_count((storage.foldername(name))[1]) < 10);

-- 6) Push alerts to admins about an order are sent once per event (no spamming by repeating requests).
alter table public.orders add column if not exists notified_accepted_at timestamptz;
alter table public.orders add column if not exists notified_done_at timestamptz;

-- 7) Sign-up rate limiting (used by the signup-driver function; service role only).
create table if not exists public.signup_attempts (ip text not null, at timestamptz not null default now());
create index if not exists signup_attempts_ip_at on public.signup_attempts (ip, at desc);
alter table public.signup_attempts enable row level security;
revoke all on public.signup_attempts from anon, authenticated;
grant all on public.signup_attempts to service_role;
`,
  },
  {
    name: "2026-11-26_translation_cache",
    sql: `
-- Translations of order texts, cached so each text is translated only once (used by the translate function only).
create table if not exists public.translations (
  key text primary key,          -- sha256 of "<lang>|<original text>"
  text text not null,
  created_at timestamptz not null default now()
);
alter table public.translations enable row level security;
revoke all on public.translations from anon, authenticated;
grant all on public.translations to service_role;
`,
  },
  {
    name: "2026-11-27_break_rules",
    sql: `
-- Breaks (German time): at most one break between 00:00 and 14:00 and one between 14:30 and 24:00;
-- no break can be started between 14:00 and 14:30. A break ends automatically after 30 minutes.
create or replace function public.enforce_break_rules()
returns trigger language plpgsql security definer set search_path = public
as $fn$
declare
  local_now timestamp := (now() at time zone 'Europe/Berlin');
  day_start timestamp := date_trunc('day', (now() at time zone 'Europe/Berlin'));
  w_start timestamptz;
  w_end timestamptz;
  used int;
begin
  if new.status is distinct from 'break' or old.status = 'break' then return new; end if;
  if local_now < day_start + interval '14 hours' then
    w_start := day_start at time zone 'Europe/Berlin';
    w_end := (day_start + interval '14 hours') at time zone 'Europe/Berlin';
  elsif local_now >= day_start + interval '14 hours 30 minutes' then
    w_start := (day_start + interval '14 hours 30 minutes') at time zone 'Europe/Berlin';
    w_end := (day_start + interval '1 day') at time zone 'Europe/Berlin';
  else
    raise exception 'break_not_allowed_now';
  end if;
  select count(*) into used from public.status_events
   where user_id = new.id and status = 'break' and started_at >= w_start and started_at < w_end;
  if used >= 1 then raise exception 'break_already_used'; end if;
  return new;
end $fn$;
revoke execute on function public.enforce_break_rules() from public, anon, authenticated;
drop trigger if exists profiles_break_rules on public.profiles;
create trigger profiles_break_rules before update of status on public.profiles
  for each row execute function public.enforce_break_rules();

-- Ends breaks that have lasted 30 minutes (also when the driver's app is closed). Runs every minute.
create or replace function public.end_long_breaks()
returns integer language sql security definer set search_path = public
as $fn$
  with done as (
    update public.profiles p set status = 'available', updated_at = now()
     where p.status = 'break'
       and coalesce((select max(e.started_at) from public.status_events e where e.user_id = p.id and e.status = 'break'), p.updated_at)
           <= now() - interval '30 minutes'
    returning 1)
  select count(*)::int from done;
$fn$;
revoke execute on function public.end_long_breaks() from public, anon, authenticated;
do $do$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('end-long-breaks', '* * * * *', 'select public.end_long_breaks()');
  end if;
end $do$;
`,
  },
  {
    name: "2026-11-27_break_return_alerts",
    sql: `
-- Marks status changes that were already checked for "orders that arrived during the break" (see overdue-orders function).
alter table public.status_events add column if not exists return_checked_at timestamptz;
create index if not exists status_events_unchecked on public.status_events (started_at) where return_checked_at is null;
`,
  },
];
