begin;

create or replace function public.resolve_api_key_for_relay(p_key_hash text)
returns table (
  api_key_id uuid,
  customer_user_id uuid,
  balance_usd numeric
)
language sql
security definer
set search_path = public
stable
as $$
  select k.id, k.user_id, w.balance_usd
  from public.api_keys k
  join public.wallets w on w.user_id = k.user_id
  where k.key_hash = p_key_hash
    and k.status = 'active'
  limit 1;
$$;

alter function public.resolve_api_key_for_relay(text) owner to postgres;
revoke all on function public.resolve_api_key_for_relay(text)
  from public, anon, authenticated;
grant execute on function public.resolve_api_key_for_relay(text)
  to service_role;

commit;
