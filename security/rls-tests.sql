-- Security tests for the database rules (run by security/run-tests.sh against a throw-away local PostgreSQL).
-- Each line prints a label and result; compare with security/expected.txt.
\set ON_ERROR_STOP 0
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000001','owner@x.de','{"display_name":"Owner","requested_role":"admin"}'),
 ('00000000-0000-0000-0000-000000000002','admin2@x.de','{"display_name":"Admin2","requested_role":"admin"}'),
 ('00000000-0000-0000-0000-000000000003','hacker@drivers.seppeler.app','{"display_name":"Hacker","requested_role":"driver"}'),
 ('00000000-0000-0000-0000-000000000004','direct@x.de','{}');
select 'roles after signup' t, u.email, (select string_agg(role::text,',') from user_roles r where r.user_id=u.id) role, (select requested_role from admin_requests q where q.user_id=u.id) pending from auth.users u order by email;
insert into orders(details,created_by) values ('Secret customer order','00000000-0000-0000-0000-000000000001');
-- pending driver tries to read orders
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
select 'pending driver sees orders' t, count(*) from orders;
select 'pending driver accept' t, accept_order((select id from orders limit 1));
update profiles set display_name='x' where id='00000000-0000-0000-0000-000000000003'; select 'own name update ok' t;
update profiles set id='00000000-0000-0000-0000-000000000009' where id='00000000-0000-0000-0000-000000000003';
reset role;
-- owner approves admin2
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select 'owner sees requests' t, count(*) from admin_requests;
select 'owner approves admin2' t, decide_admin_request('00000000-0000-0000-0000-000000000002', true);
reset role;
-- admin2 (not owner): sees driver requests only, can approve driver, cannot approve admin
insert into auth.users(id,email,raw_user_meta_data) values ('00000000-0000-0000-0000-000000000005','admin3@x.de','{"display_name":"Admin3","requested_role":"admin"}');
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select 'admin2 sees requests' t, string_agg(requested_role::text, ',') from admin_requests;
select 'admin2 approves admin3 (should fail)' t, decide_admin_request('00000000-0000-0000-0000-000000000005', true);
select 'admin2 approves hacker driver' t, decide_admin_request('00000000-0000-0000-0000-000000000003', true);
select 'admin2 declines direct signup' t, decide_admin_request('00000000-0000-0000-0000-000000000004', false);
reset role;
select 'direct signup deleted' t, count(*) from auth.users where id='00000000-0000-0000-0000-000000000004';
-- approved driver: accept & photos
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
select 'driver sees orders' t, count(*) from orders;
select 'driver accepts' t, accept_order((select id from orders limit 1));
insert into storage.objects(bucket_id,name) select 'order-photos', o.id||'/1764130000000.jpg' from orders o; select 'photo upload ok' t;
insert into storage.objects(bucket_id,name) select 'order-photos', o.id||'/evil.html' from orders o;
insert into storage.objects(bucket_id,name) select 'order-photos', o.id||'/17641300000'||g||'.jpg' from orders o, generate_series(10,25) g;
select 'complete with 1 photo (should fail)' t, complete_order((select id from orders limit 1));
reset role;
select 'photos stored' t, count(*) from storage.objects;
-- anonymous visitor
set role anon;
select 'anon reads orders' t, count(*) from orders;
select 'anon has_role' t, has_role('00000000-0000-0000-0000-000000000001','admin');
reset role;

insert into orders(details,created_by) values ('Order B','00000000-0000-0000-0000-000000000001');
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
update profiles set status='available' where id='00000000-0000-0000-0000-000000000003';
select accept_order((select id from orders where details='Order B'));
insert into storage.objects(bucket_id,name) select 'order-photos', id||'/1764130000010.jpg' from orders where details='Order B';
insert into storage.objects(bucket_id,name) select 'order-photos', id||'/1764130000011.jpg' from orders where details='Order B';
insert into storage.objects(bucket_id,name) select 'order-photos', id||'/1764130000012.jpg' from orders where details='Order B';
insert into storage.objects(bucket_id,name) select 'order-photos', id||'/1764130000013.jpg' from orders where details='Order B';
insert into storage.objects(bucket_id,name) select 'order-photos', id||'/1764130000014.jpg' from orders where details='Order B';
insert into storage.objects(bucket_id,name) select 'order-photos', id||'/1764130000015.jpg' from orders where details='Order B';
insert into storage.objects(bucket_id,name) select 'order-photos', id||'/1764130000016.jpg' from orders where details='Order B';
insert into storage.objects(bucket_id,name) select 'order-photos', id||'/1764130000017.jpg' from orders where details='Order B';
insert into storage.objects(bucket_id,name) select 'order-photos', id||'/1764130000018.jpg' from orders where details='Order B';
insert into storage.objects(bucket_id,name) select 'order-photos', id||'/1764130000019.jpg' from orders where details='Order B';
insert into storage.objects(bucket_id,name) select 'order-photos', id||'/1764130000020.jpg' from orders where details='Order B';
insert into storage.objects(bucket_id,name) select 'order-photos', id||'/1764130000021.jpg' from orders where details='Order B';
reset role; select 'photos on order B' t, count(*) from storage.objects o join orders x on (storage.foldername(o.name))[1]=x.id::text where x.details='Order B';
