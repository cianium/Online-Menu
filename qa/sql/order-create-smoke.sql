\set ON_ERROR_STOP on

begin;

do $$
declare
  v_restaurant uuid;
  v_category uuid;
  v_branch uuid;
  v_table uuid;
  v_session uuid;
  v_first jsonb;
  v_second jsonb;
  v_status jsonb;
  v_order uuid;
begin
  insert into public.restaurants(slug, name, currency)
  values ('order-create-smoke', 'Order Create Smoke', 'IRR')
  returning id into v_restaurant;

  insert into public.categories(restaurant_id, slug, active)
  values (v_restaurant, 'drinks', true)
  returning id into v_category;
  insert into public.category_translations(category_id, language_code, name)
  values (v_category, 'fa', 'نوشیدنی');
  insert into public.products(restaurant_id, category_id, slug, price, active)
  values (v_restaurant, v_category, 'fresh-orange', 130000, true);
  insert into public.product_translations(product_id, language_code, name)
  select id, 'fa', 'آب پرتقال تازه'
  from public.products
  where restaurant_id = v_restaurant and slug = 'fresh-orange';

  insert into public.branches(
    restaurant_id, slug, name, qr_ordering_enabled,
    currency_code, currency_exponent, menu_price_to_minor_multiplier
  ) values (
    v_restaurant, 'main', 'Main', true, 'IRR', 0, 10
  ) returning id into v_branch;
  insert into public.restaurant_tables(restaurant_id, branch_id, code, display_name)
  values (v_restaurant, v_branch, 'T1', 'Table 1')
  returning id into v_table;

  v_first := public.romano_open_table_session(
    v_branch, v_table, 1, repeat('a', 64), 14400
  );
  v_second := public.romano_open_table_session(
    v_branch, v_table, 1, repeat('b', 64), 14400
  );
  if v_first->>'sessionId' <> v_second->>'sessionId' then
    raise exception 'Repeated QR scan did not reuse the open table session';
  end if;
  v_session := (v_first->>'sessionId')::uuid;
  if (select count(*) from public.table_session_tokens where table_session_id = v_session) <> 2 then
    raise exception 'Multiple diners did not receive independent session tokens';
  end if;

  begin
    perform public.romano_open_table_session(
      v_branch, v_table, 2, repeat('c', 64), 14400
    );
    raise exception 'Expected stale QR version to fail';
  exception when invalid_parameter_value then
    null;
  end;

  v_first := public.romano_create_qr_order(
    repeat('b', 64), 'fa', 'order-create-smoke-0001', repeat('d', 64),
    '[{"productId":"fresh-orange","quantity":2,"notes":"cold","modifiers":[]}]'::jsonb,
    'less sugar'
  );
  v_order := (v_first->>'id')::uuid;
  if v_first->>'status' <> 'submitted'
     or (v_first->>'totalMinor')::bigint <> 2600000
     or (v_first->>'idempotentReplay')::boolean then
    raise exception 'Unexpected order create result: %', v_first;
  end if;

  v_second := public.romano_create_qr_order(
    repeat('b', 64), 'fa', 'order-create-smoke-0001', repeat('d', 64),
    '[{"productId":"fresh-orange","quantity":2,"notes":"cold","modifiers":[]}]'::jsonb,
    'less sugar'
  );
  if not (v_second->>'idempotentReplay')::boolean
     or v_second->>'id' <> v_order::text
     or (select count(*) from public.orders where restaurant_id = v_restaurant) <> 1 then
    raise exception 'Idempotent replay created a duplicate order: %', v_second;
  end if;

  begin
    perform public.romano_create_qr_order(
      repeat('b', 64), 'fa', 'order-create-smoke-0001', repeat('e', 64),
      '[{"productId":"fresh-orange","quantity":1}]'::jsonb, null
    );
    raise exception 'Expected idempotency fingerprint conflict';
  exception when invalid_parameter_value then
    null;
  end;

  v_status := public.romano_get_qr_order(repeat('a', 64), v_order);
  if v_status->>'id' <> v_order::text
     or jsonb_array_length(v_status->'events') <> 1
     or v_status->'events'->0->>'toStatus' <> 'submitted' then
    raise exception 'Order status response is incomplete: %', v_status;
  end if;

  begin
    perform public.romano_get_qr_order(repeat('f', 64), v_order);
    raise exception 'Expected an unrelated token to hide the order';
  exception when invalid_parameter_value then
    null;
  end;

  update public.branches set auto_accept_qr_orders = true where id = v_branch;
  v_second := public.romano_create_qr_order(
    repeat('b', 64), 'fa', 'order-create-smoke-0002', repeat('f', 64),
    '[{"productId":"fresh-orange","quantity":1}]'::jsonb, null
  );
  if v_second->>'status' <> 'accepted' or (v_second->>'version')::bigint <> 2 then
    raise exception 'Auto-accepted order has an unexpected state: %', v_second;
  end if;

  if has_function_privilege(
    'anon', 'public.romano_create_qr_order(text,text,text,text,jsonb,text)', 'execute'
  ) or has_function_privilege(
    'authenticated', 'public.romano_get_qr_order(text,uuid)', 'execute'
  ) or has_function_privilege(
    'service_role', 'public.romano_order_payload(uuid)', 'execute'
  ) then
    raise exception 'Order function privileges are too broad';
  end if;
  if not has_function_privilege(
    'service_role', 'public.romano_create_qr_order(text,text,text,text,jsonb,text)', 'execute'
  ) then
    raise exception 'Service role cannot create QR orders';
  end if;
end;
$$;

rollback;

select 'ROMANO order create smoke passed' as result;
