\set ON_ERROR_STOP on

begin;

do $$
declare
  v_restaurant uuid;
  v_category uuid;
  v_branch uuid;
  v_table uuid;
  v_payload jsonb;
  v_payment jsonb;
  v_attempt uuid;
  v_order uuid;
  v_authority text := 'A000000000000000000000000000000001';
begin
  insert into public.restaurants(slug,name,currency)
  values ('commerce-smoke','Commerce Smoke','IRR') returning id into v_restaurant;
  insert into public.categories(restaurant_id,slug,active)
  values (v_restaurant,'food',true) returning id into v_category;
  insert into public.category_translations(category_id,language_code,name)
  values (v_category,'fa','غذا');
  insert into public.products(restaurant_id,category_id,slug,price,active)
  values (v_restaurant,v_category,'smoke-burger',150000,true);
  insert into public.product_translations(product_id,language_code,name)
  select id,'fa','برگر تست' from public.products
  where restaurant_id=v_restaurant and slug='smoke-burger';
  insert into public.branches(
    restaurant_id,slug,name,qr_ordering_enabled,currency_code,
    currency_exponent,menu_price_to_minor_multiplier
  ) values (v_restaurant,'main','Main',true,'IRR',0,10)
  returning id into v_branch;
  insert into public.restaurant_tables(restaurant_id,branch_id,code,display_name)
  values (v_restaurant,v_branch,'T1','Table 1') returning id into v_table;
  perform public.romano_open_table_session(v_branch,v_table,1,repeat('a',64),14400);
  v_payload:=public.romano_create_qr_order(
    repeat('a',64),'fa','commerce-order-00000001',repeat('b',64),
    '[{"productId":"smoke-burger","quantity":1,"modifiers":[]}]'::jsonb,null
  );
  v_order:=(v_payload->>'id')::uuid;

  insert into public.branch_payment_gateways(
    restaurant_id,branch_id,provider,merchant_id,sandbox,active
  ) values (
    v_restaurant,v_branch,'zarinpal','00000000-0000-0000-0000-000000000001',true,true
  );
  v_payment:=public.romano_prepare_payment(
    repeat('a',64),v_order,'commerce-payment-000001'
  );
  v_attempt:=(v_payment->>'attemptId')::uuid;
  if (v_payment->>'amountMinor')::bigint<>1500000
     or v_payment->>'currencyCode'<>'IRR'
     or v_payment->>'provider'<>'zarinpal' then
    raise exception 'Unexpected payment preparation: %',v_payment;
  end if;
  if (select payment_status from public.orders where id=v_order)<>'pending' then
    raise exception 'Order was not marked pending';
  end if;

  v_payment:=public.romano_prepare_payment(
    repeat('a',64),v_order,'commerce-payment-000002'
  );
  if (v_payment->>'attemptId')::uuid<>v_attempt
     or (v_payment->>'created')::boolean then
    raise exception 'Concurrent payment request did not reuse the active attempt: %',v_payment;
  end if;

  v_payment:=public.romano_attach_payment_authority(v_attempt,v_authority,100);
  if v_payment->>'status'<>'requested' then
    raise exception 'Authority was not attached: %',v_payment;
  end if;
  v_payment:=public.romano_payment_callback_context(v_authority);
  if v_payment->>'orderId'<>v_order::text
     or v_payment->>'merchantId'<>'00000000-0000-0000-0000-000000000001' then
    raise exception 'Callback context is incomplete: %',v_payment;
  end if;
  v_payment:=public.romano_finalize_payment(
    v_authority,true,100,'99112233','123456******7890',1000,null
  );
  if v_payment->>'status'<>'verified'
     or (select payment_status from public.orders where id=v_order)<>'paid' then
    raise exception 'Payment was not finalized: %',v_payment;
  end if;
  v_payment:=public.romano_finalize_payment(
    v_authority,true,101,'99112233','123456******7890',1000,null
  );
  if not (v_payment->>'idempotentReplay')::boolean then
    raise exception 'Repeated verification was not idempotent';
  end if;
  v_payment:=public.romano_finalize_payment(
    v_authority,false,-1,null,null,null,'CUSTOMER_CANCELLED'
  );
  if (v_payment->>'successful')::boolean is not true
     or (select payment_status from public.orders where id=v_order)<>'paid' then
    raise exception 'A late failed callback downgraded a paid order: %',v_payment;
  end if;
  if (select count(*) from public.integration_outbox
      where aggregate_id=v_order and event_type='payment.verified')<>1 then
    raise exception 'Payment outbox event is missing or duplicated';
  end if;

  begin
    update public.orders set payment_status='refunded' where id=v_order;
    raise exception 'Expected direct payment status mutation to fail';
  exception when object_not_in_prerequisite_state then
    null;
  end;

  perform set_config('romano.payment_update','allowed',true);
  begin
    update public.orders set payment_status='failed' where id=v_order;
    raise exception 'Expected paid-to-failed regression to fail';
  exception when object_not_in_prerequisite_state then
    null;
  end;
  perform set_config('romano.payment_update','denied',true);

  if has_table_privilege('anon','public.payment_attempts','select')
     or has_table_privilege('authenticated','public.branch_payment_gateways','select')
     or has_function_privilege('anon','public.romano_prepare_payment(text,uuid,text)','execute') then
    raise exception 'Commerce privileges are too broad';
  end if;
end;
$$;

rollback;

select 'ROMANO commerce smoke passed' as result;
