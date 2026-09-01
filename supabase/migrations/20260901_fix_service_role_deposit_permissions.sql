begin;

grant usage on schema public to service_role;
grant select, insert, update on table public.deposits to service_role;
grant select on table public.profiles to service_role;

commit;
