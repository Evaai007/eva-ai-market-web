begin;

create or replace function public.list_my_api_keys()
returns table (
  id uuid,
  key_prefix text,
  status text,
  created_at timestamptz,
  last_used_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select k.id, k.key_prefix, k.status, k.created_at, k.last_used_at
  from public.api_keys as k
  where k.user_id = auth.uid()
  order by k.created_at desc;
$$;

alter function public.list_my_api_keys() owner to postgres;
revoke all on function public.list_my_api_keys() from public;
grant execute on function public.list_my_api_keys() to authenticated;

create or replace function public.issue_customer_api_key(
  p_user_id uuid,
  p_key_hash text,
  p_key_prefix text,
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric(14,6);
  v_active_count integer;
  v_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Not authorized';
  end if;

  select balance_usd into v_balance
  from public.wallets
  where user_id = p_user_id;

  if v_balance is null then
    raise exception 'Customer wallet not found';
  end if;
  if v_balance < 0.05 then
    raise exception 'Add approved credits before creating an API key';
  end if;

  select count(*) into v_active_count
  from public.api_keys
  where user_id = p_user_id and status = 'active';

  if v_active_count >= 3 then
    raise exception 'Maximum 3 active keys per account';
  end if;

  insert into public.api_keys(user_id, key_hash, key_prefix, name, status)
  values (p_user_id, p_key_hash, p_key_prefix, left(coalesce(nullif(trim(p_name), ''), 'Gemini key'), 60), 'active')
  returning id into v_id;

  return v_id;
end;
$$;

alter function public.issue_customer_api_key(uuid,text,text,text) owner to postgres;
revoke all on function public.issue_customer_api_key(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.issue_customer_api_key(uuid,text,text,text) to service_role;

create or replace function public.reset_customer_api_keys(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Not authorized';
  end if;

  update public.api_keys
  set status = 'revoked'
  where user_id = p_user_id and status = 'active';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

alter function public.reset_customer_api_keys(uuid) owner to postgres;
revoke all on function public.reset_customer_api_keys(uuid) from public, anon, authenticated;
grant execute on function public.reset_customer_api_keys(uuid) to service_role;

commit;
