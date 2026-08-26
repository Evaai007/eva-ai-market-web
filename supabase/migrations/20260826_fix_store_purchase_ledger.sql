create or replace function public.purchase_store_product(p_user_id uuid,p_product_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_product public.store_products%rowtype; v_balance numeric(14,6); v_order_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'Not authorized'; end if;

  select * into v_product
  from public.store_products
  where id=p_product_id and active=true
  for update;

  if not found then raise exception 'Product unavailable'; end if;
  if v_product.stock < 1 then raise exception 'Out of stock'; end if;

  select balance_usd into v_balance
  from public.wallets
  where user_id=p_user_id
  for update;

  if v_balance is null then raise exception 'Customer wallet not found'; end if;
  if v_balance < v_product.price_usd then raise exception 'Insufficient balance'; end if;

  v_balance := v_balance-v_product.price_usd;

  update public.wallets
  set balance_usd=v_balance,updated_at=now()
  where user_id=p_user_id;

  update public.store_products
  set stock=stock-1,updated_at=now()
  where id=v_product.id;

  insert into public.store_orders(user_id,product_id,product_name,price_usd,warranty_days)
  values(
    p_user_id,
    v_product.id,
    v_product.name||case when v_product.subtitle<>'' then ' — '||v_product.subtitle else '' end,
    v_product.price_usd,
    v_product.warranty_days
  )
  returning id into v_order_id;

  insert into public.wallet_ledger(user_id,amount_usd,entry_type,description,reference_id,balance_after)
  values(
    p_user_id,
    -v_product.price_usd,
    'adjustment',
    'Store purchase: '||v_product.name,
    v_order_id,
    v_balance
  );

  return jsonb_build_object('order_id',v_order_id,'balance',v_balance,'stock',v_product.stock-1);
end $$;

create or replace function public.admin_update_store_order(p_order_id uuid,p_status text,p_delivery_details text default null,p_admin_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_order public.store_orders%rowtype; v_balance numeric(14,6);
begin
  if auth.role() <> 'service_role' then raise exception 'Not authorized'; end if;
  if p_status not in ('approved','processing','delivered','cancelled','refunded') then raise exception 'Invalid status'; end if;

  select * into v_order
  from public.store_orders
  where id=p_order_id
  for update;

  if not found then raise exception 'Order not found'; end if;
  if v_order.status='refunded' then raise exception 'Refunded order cannot be changed'; end if;

  if p_status='refunded' and v_order.status<>'refunded' then
    select balance_usd into v_balance
    from public.wallets
    where user_id=v_order.user_id
    for update;

    if v_balance is null then raise exception 'Customer wallet not found'; end if;

    v_balance:=v_balance+v_order.price_usd;

    update public.wallets
    set balance_usd=v_balance,updated_at=now()
    where user_id=v_order.user_id;

    update public.store_products
    set stock=stock+1,updated_at=now()
    where id=v_order.product_id;

    insert into public.wallet_ledger(user_id,amount_usd,entry_type,description,reference_id,balance_after)
    values(
      v_order.user_id,
      v_order.price_usd,
      'adjustment',
      'Store refund: '||v_order.product_name,
      v_order.id,
      v_balance
    );
  end if;

  update public.store_orders
  set status=p_status,
      delivery_details=coalesce(nullif(p_delivery_details,''),delivery_details),
      admin_note=coalesce(nullif(p_admin_note,''),admin_note),
      updated_at=now(),
      delivered_at=case when p_status='delivered' then now() else delivered_at end
  where id=p_order_id;

  return jsonb_build_object('order_id',p_order_id,'status',p_status);
end $$;

revoke all on function public.purchase_store_product(uuid,text),public.admin_update_store_order(uuid,text,text,text)
from public,anon,authenticated;

grant execute on function public.purchase_store_product(uuid,text),public.admin_update_store_order(uuid,text,text,text)
to service_role;
