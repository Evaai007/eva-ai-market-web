begin;

create or replace function public.admin_list_deposits()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'user_id', d.user_id,
        'amount_usdt', d.amount_usdt,
        'network', d.network,
        'transaction_id', d.transaction_id,
        'status', d.status,
        'admin_note', d.admin_note,
        'created_at', d.created_at,
        'reviewed_at', d.reviewed_at,
        'profile', jsonb_build_object(
          'id', p.id,
          'email', p.email,
          'telegram_username', p.telegram_username
        )
      )
      order by d.created_at desc
    ),
    '[]'::jsonb
  )
  from (
    select *
    from public.deposits
    order by created_at desc
    limit 100
  ) d
  left join public.profiles p on p.id = d.user_id;
$$;

alter function public.admin_list_deposits() owner to postgres;
revoke all on function public.admin_list_deposits()
  from public, anon, authenticated;
grant execute on function public.admin_list_deposits()
  to service_role;

alter function public.approve_deposit(uuid,text) owner to postgres;
revoke all on function public.approve_deposit(uuid,text)
  from public, anon, authenticated;
grant execute on function public.approve_deposit(uuid,text)
  to service_role;

commit;
