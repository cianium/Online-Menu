\set ON_ERROR_STOP on

begin;

do $$
declare
  v_restaurant uuid;
  v_owner uuid := gen_random_uuid();
  v_kitchen uuid := gen_random_uuid();
  v_branch uuid;
  v_table uuid;
  v_session uuid;
  v_order uuid;
  v_auto_order uuid;
  v_result jsonb;
  v_table_name text;
begin
  insert into public.restaurants(slug, name, currency)
  values ('order-smoke', 'Order Smoke', 'IRR')
  returning id into v_restaurant;

  insert into public.users(id, email, display_name)
  values
    (v_owner, 'owner@order-smoke.invalid', 'Owner'),
    (v_kitchen, 'kitchen@order-smoke.invalid', 'Kitchen');

  insert into public.restaurant_memberships(restaurant_id, user_id, role)
  values (v_restaurant, v_owner, 'owner');

  -- Ordering cannot be enabled until catalog prices have an explicit
  -- conversion into canonical minor units.
  begin
    insert into public.branches(restaurant_id, slug, name, qr_ordering_enabled)
    values (v_restaurant, 'invalid-money', 'Invalid money', true);
    raise exception 'Expected QR money configuration constraint to fail';
  exception when check_violation then
    null;
  end;

  insert into public.branches(
    restaurant_id, slug, name, qr_ordering_enabled, auto_accept_qr_orders,
    currency_code, currency_exponent, menu_price_to_minor_multiplier
  ) values (
    v_restaurant, 'main', 'Main', true, false, 'IRR', 0, 10
  ) returning id into v_branch;

  insert into public.branch_staff_memberships(restaurant_id, branch_id, user_id, role)
  values (v_restaurant, v_branch, v_kitchen, 'kitchen');

  insert into public.restaurant_tables(restaurant_id, branch_id, code, display_name)
  values (v_restaurant, v_branch, 'T1', 'Table 1')
  returning id into v_table;

  insert into public.table_sessions(
    restaurant_id, branch_id, table_id, opened_source, expires_at
  ) values (
    v_restaurant, v_branch, v_table, 'qr', now() + interval '4 hours'
  ) returning id into v_session;

  insert into public.table_session_tokens(
    restaurant_id, branch_id, table_session_id, token_hash, expires_at
  ) values (
    v_restaurant, v_branch, v_session, repeat('a', 64), now() + interval '4 hours'
  );

  begin
    insert into public.table_sessions(
      restaurant_id, branch_id, table_id, opened_source, expires_at
    ) values (
      v_restaurant, v_branch, v_table, 'qr', now() + interval '4 hours'
    );
    raise exception 'Expected one-open-session constraint to fail';
  exception when unique_violation then
    null;
  end;

  insert into public.orders(
    restaurant_id, branch_id, table_session_id, order_number, channel,
    currency_code, currency_exponent, subtotal_minor, total_minor,
    idempotency_key, request_fingerprint
  ) values (
    v_restaurant, v_branch, v_session, 1, 'qr_dine_in',
    'IRR', 0, 1300000, 1300000,
    'order-smoke-key-0001', repeat('c', 64)
  ) returning id into v_order;

  insert into public.order_items(
    restaurant_id, branch_id, order_id, product_slug, product_name,
    quantity, unit_price_minor, line_total_minor
  ) values (
    v_restaurant, v_branch, v_order, 'fresh-orange', 'Fresh Orange',
    1, 1300000, 1300000
  );

  insert into public.order_events(
    restaurant_id, branch_id, order_id, from_status, to_status, actor_type
  ) values (
    v_restaurant, v_branch, v_order, null, 'submitted', 'customer'
  );

  begin
    insert into public.orders(
      restaurant_id, branch_id, table_session_id, order_number, channel,
      currency_code, currency_exponent, subtotal_minor, total_minor,
      idempotency_key, request_fingerprint
    ) values (
      v_restaurant, v_branch, v_session, 2, 'qr_dine_in',
      'IRR', 0, 1, 1,
      'order-smoke-key-0001', repeat('d', 64)
    );
    raise exception 'Expected idempotency constraint to fail';
  exception when unique_violation then
    null;
  end;

  v_result := public.romano_transition_order(
    v_order, 1, 'accepted', v_owner, 'staff', null, '{}'::jsonb
  );
  if v_result->>'status' <> 'accepted' or (v_result->>'version')::bigint <> 2 then
    raise exception 'Unexpected accepted transition result: %', v_result;
  end if;

  begin
    perform public.romano_transition_order(
      v_order, 1, 'preparing', v_kitchen, 'staff', null, '{}'::jsonb
    );
    raise exception 'Expected optimistic version conflict';
  exception when serialization_failure then
    null;
  end;

  begin
    perform public.romano_transition_order(
      v_order, 2, 'ready', v_kitchen, 'staff', null, '{}'::jsonb
    );
    raise exception 'Expected illegal transition to fail';
  exception when invalid_parameter_value then
    null;
  end;

  v_result := public.romano_transition_order(
    v_order, 2, 'preparing', v_kitchen, 'staff', null, '{}'::jsonb
  );
  if v_result->>'status' <> 'preparing' or (v_result->>'version')::bigint <> 3 then
    raise exception 'Unexpected preparing transition result: %', v_result;
  end if;

  update public.branches set auto_accept_qr_orders = true where id = v_branch;
  insert into public.orders(
    restaurant_id, branch_id, table_session_id, order_number, channel,
    currency_code, currency_exponent, subtotal_minor, total_minor,
    idempotency_key, request_fingerprint
  ) values (
    v_restaurant, v_branch, v_session, 2, 'qr_dine_in',
    'IRR', 0, 2000, 2000,
    'order-smoke-key-0002', repeat('e', 64)
  ) returning id into v_auto_order;
  v_result := public.romano_transition_order(
    v_auto_order, 1, 'accepted', null, 'system', null, '{}'::jsonb
  );
  if v_result->>'status' <> 'accepted' then
    raise exception 'Auto-accept transition failed: %', v_result;
  end if;

  begin
    update public.orders set total_minor = total_minor + 1 where id = v_order;
    raise exception 'Expected immutable order totals to reject mutation';
  exception when object_not_in_prerequisite_state then
    null;
  end;

  begin
    update public.order_items set quantity = 2 where order_id = v_order;
    raise exception 'Expected accepted order items to be locked';
  exception when object_not_in_prerequisite_state then
    null;
  end;

  if (select count(*) from public.order_events where order_id = v_order) <> 3 then
    raise exception 'Order event history is incomplete';
  end if;
  if (select count(*) from public.integration_outbox where aggregate_id = v_order) <> 2 then
    raise exception 'Order outbox history is incomplete';
  end if;
  foreach v_table_name in array array[
    'branches', 'branch_staff_memberships', 'restaurant_tables', 'table_sessions',
    'table_session_tokens',
    'branch_order_counters', 'orders', 'order_items', 'order_events', 'integration_outbox'
  ] loop
    if not (select relrowsecurity from pg_class where oid = ('public.' || v_table_name)::regclass) then
      raise exception 'RLS is not enabled on %', v_table_name;
    end if;
  end loop;
  if has_table_privilege('anon', 'public.orders', 'select')
     or has_table_privilege('authenticated', 'public.orders', 'insert') then
    raise exception 'Browser roles unexpectedly have order table privileges';
  end if;
  if has_function_privilege(
    'anon',
    'public.romano_transition_order(uuid,bigint,text,uuid,text,text,jsonb)',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.romano_transition_order(uuid,bigint,text,uuid,text,text,jsonb)',
    'execute'
  ) then
    raise exception 'Browser roles unexpectedly can execute the transition RPC';
  end if;
  if not has_function_privilege(
    'service_role',
    'public.romano_transition_order(uuid,bigint,text,uuid,text,text,jsonb)',
    'execute'
  ) then
    raise exception 'Service role cannot execute the transition RPC';
  end if;
end;
$$;

rollback;

select 'ROMANO order core smoke passed' as result;
