-- Seppeler Gabelstapler-Disponent: complete database setup.
-- Run this ONCE in a NEW Supabase project: Dashboard → SQL Editor → New query → paste → Run.
-- (Combines all 11 Lovable migrations into their final state.)

create type public.app_role as enum ('admin','driver');
create type public.driver_status as enum ('available','busy','off','break');

-- Profiles -----------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  status public.driver_status not null default 'off',
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- Roles --------------------------------------------------------------------
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "read own or admin reads all" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Orders -------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  details text not null,
  status text not null default 'open',
  created_by uuid not null,
  accepted_by uuid,
  accepted_at timestamptz,
  overdue_alerted_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "admins manage orders" on public.orders for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin') and created_by = auth.uid());
create policy "drivers read orders" on public.orders for select to authenticated
  using (public.has_role(auth.uid(),'driver') and (status='open' or accepted_by = auth.uid()));

-- First driver to accept wins (atomic).
create or replace function public.accept_order(_order_id uuid)
returns boolean language plpgsql security definer set search_path = public
as $$
declare ok boolean;
begin
  if not public.has_role(auth.uid(),'driver') then raise exception 'not a driver'; end if;
  update public.orders set status='accepted', accepted_by=auth.uid(), accepted_at=now()
    where id=_order_id and status='open';
  ok := found;
  if ok then update public.profiles set status='busy', updated_at=now() where id=auth.uid(); end if;
  return ok;
end $$;
revoke execute on function public.accept_order(uuid) from public, anon;
grant execute on function public.accept_order(uuid) to authenticated;

create or replace function public.complete_order(_order_id uuid)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  update public.orders set status='done' where id=_order_id and accepted_by=auth.uid() and status='accepted';
  if found then update public.profiles set status='available', updated_at=now() where id=auth.uid(); end if;
  return found;
end $$;
revoke execute on function public.complete_order(uuid) from public, anon;
grant execute on function public.complete_order(uuid) to authenticated;

-- Admin requests / owner -----------------------------------------------------
create table public.app_owner (user_id uuid primary key);
grant select on public.app_owner to authenticated;
grant all on public.app_owner to service_role;
alter table public.app_owner enable row level security;
create policy "read own owner row" on public.app_owner for select to authenticated using (user_id = auth.uid());

create table public.admin_requests (
  user_id uuid primary key,
  display_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);
grant select on public.admin_requests to authenticated;
grant all on public.admin_requests to service_role;
alter table public.admin_requests enable row level security;
create policy "own or admin reads" on public.admin_requests for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- The very first account becomes the owner/admin. Later admin sign-ups need approval; everyone else is a driver.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare _name text := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1));
begin
  insert into public.profiles(id, display_name) values (new.id, _name);
  if not exists (select 1 from public.app_owner) then
    insert into public.app_owner(user_id) values (new.id);
    insert into public.user_roles(user_id, role) values (new.id,'admin');
  elsif new.raw_user_meta_data->>'requested_role' = 'admin' then
    insert into public.admin_requests(user_id, display_name, email) values (new.id, _name, coalesce(new.email,''));
  else
    insert into public.user_roles(user_id, role) values (new.id,'driver');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.decide_admin_request(_user_id uuid, _approve boolean)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only administrators can approve administrators';
  end if;
  delete from public.admin_requests where user_id = _user_id;
  if not found then return false; end if;
  insert into public.user_roles(user_id, role) values (_user_id, case when _approve then 'admin'::app_role else 'driver'::app_role end)
    on conflict do nothing;
  return true;
end $$;
revoke execute on function public.decide_admin_request(uuid, boolean) from public, anon;
grant execute on function public.decide_admin_request(uuid, boolean) to authenticated;

create or replace function public.list_admin_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select user_id from public.user_roles where role = 'admin' and public.has_role(auth.uid(), 'admin');
$$;
revoke all on function public.list_admin_ids() from public, anon;
grant execute on function public.list_admin_ids() to authenticated;

-- Push subscriptions -----------------------------------------------------------
create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
alter table public.push_subscriptions enable row level security;
create policy "own subs" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Customers (admin list used to prefill orders) ----------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "admins manage customers" on public.customers for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin') and created_by = auth.uid());

-- Status history (shift timers) -------------------------------------------------
create table public.status_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  status public.driver_status not null,
  started_at timestamptz not null default now()
);
create index status_events_user_time on public.status_events (user_id, started_at desc);
grant select on public.status_events to authenticated;
grant all on public.status_events to service_role;
alter table public.status_events enable row level security;
create policy "own or admin read status events" on public.status_events for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create or replace function public.log_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.status_events (user_id, status) values (new.id, new.status);
  end if;
  return new;
end $$;
create trigger profiles_status_log after insert or update of status on public.profiles
  for each row execute function public.log_status_change();

-- Live updates ------------------------------------------------------------------
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.profiles;
