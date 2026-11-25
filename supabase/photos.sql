-- Order photos: drivers must upload 3 photos before an order can be finished; admins can view them later.
-- Private storage bucket (files only reachable with a short-lived signed link), max 5 MB per image.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-photos', 'order-photos', false, 5242880, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

-- Files are stored as <order id>/<timestamp>.jpg
create policy "driver uploads photos for own open order" on storage.objects for insert to authenticated
  with check (bucket_id = 'order-photos' and exists (
    select 1 from public.orders o
    where o.id::text = (storage.foldername(name))[1] and o.accepted_by = auth.uid() and o.status = 'accepted'));

create policy "driver removes photos of own open order" on storage.objects for delete to authenticated
  using (bucket_id = 'order-photos' and exists (
    select 1 from public.orders o
    where o.id::text = (storage.foldername(name))[1] and o.accepted_by = auth.uid() and o.status = 'accepted'));

create policy "admins and the driver view order photos" on storage.objects for select to authenticated
  using (bucket_id = 'order-photos' and (public.has_role(auth.uid(), 'admin') or exists (
    select 1 from public.orders o
    where o.id::text = (storage.foldername(name))[1] and o.accepted_by = auth.uid())));

-- An order can only be finished once it has at least 3 photos.
create or replace function public.complete_order(_order_id uuid)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if (select count(*) from storage.objects
      where bucket_id = 'order-photos' and (storage.foldername(name))[1] = _order_id::text) < 3 then
    raise exception 'Bitte zuerst 3 Fotos vom Auftrag aufnehmen.';
  end if;
  update public.orders set status='done' where id=_order_id and accepted_by=auth.uid() and status='accepted';
  if found then update public.profiles set status='available', updated_at=now() where id=auth.uid(); end if;
  return found;
end $$;
revoke execute on function public.complete_order(uuid) from public, anon;
grant execute on function public.complete_order(uuid) to authenticated;

-- Admins may delete order photos (used when an order is deleted).
create policy "admins delete order photos" on storage.objects for delete to authenticated
  using (bucket_id = 'order-photos' and public.has_role(auth.uid(), 'admin'));
