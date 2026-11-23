\set ON_ERROR_STOP on
begin;

do $tenant_isolation$
declare
  v_restaurant_a uuid;
  v_restaurant_b uuid;
  v_category_a uuid;
  v_category_b uuid;
  v_branch_a uuid;
  v_branch_b uuid;
  v_table_a uuid;
  v_table_b uuid;
  v_actor uuid := gen_random_uuid();
  v_order_a uuid;
  v_order_b uuid;
  v_order_inactive uuid;
  v_order_unmembered uuid;
  v_result jsonb;
begin
  insert into public.users(id,active) values (v_actor,true);

  insert into public.restaurants(slug,name,currency)
  values ('tenant-a-smoke','Tenant A','IRR') returning id into v_restaurant_a;
  insert into public.restaurants(slug,name,currency)
  values ('tenant-b-smoke','Tenant B','IRR') returning id into v_restaurant_b;

  insert into public.restaurant_memberships(restaurant_id,user_id,role)
  values (v_restaurant_a,v_actor,'owner');

  insert into public.categories(restaurant_id,slug,active)
  values (v_restaurant_a,'food',true) returning id into v_category_a;
  insert into public.categories(restaurant_id,slug,active)
  values (v_restaurant_b,'food',true) returning id into v_category_b;

  insert into public.category_translations(category_id,language_code,name)
  values (v_category_a,'fa','غذا'),(v_category_b,'fa','غذا');

  insert into public.products(restaurant_id,category_id,slug,price,active)
  values (v_restaurant_a,v_category_a,'tenant-a-product',100,true);
  insert into public.products(restaurant_id,category_id,slug,price,active)
  values (v_restaurant_b,v_category_b,'tenant-b-product',200,true);

  insert into public.product_translations(product_id,language_code,name)
  select id,'fa','محصول تست'
    from public.products
   where restaurant_id in (v_restaurant_a,v_restaurant_b);

  insert into public.branches(
    restaurant_id,slug,name,qr_ordering_enabled,currency_code,
    currency_exponent,menu_price_to_minor_multiplier
  ) values
    (v_restaurant_a,'main','Tenant A Main',true,'IRR',0,10)
  returning id into v_branch_a;

  insert into public.branches(
    restaurant_id,slug,name,qr_ordering_enabled,currency_code,
    currency_exponent,menu_price_to_minor_multiplier
  ) values
    (v_restaurant_b,'main','Tenant B Main',true,'IRR',0,10)
  returning id into v_branch_b;

  insert into public.restaurant_tables(restaurant_id,branch_id,code,display_name)
  values (v_restaurant_a,v_branch_a,'A1','A Table') returning id into v_table_a;
  insert into public.restaurant_tables(restaurant_id,branch_id,code,display_name)
  values (v_restaurant_b,v_branch_b,'B1','B Table') returning id into v_table_b;

  perform public.romano_open_table_session(v_branch_a,v_table_a,1,repeat('a',64),14400);
  perform public.romano_open_table_session(v_branch_b,v_table_b,1,repeat('b',64),14400);

  v_result:=public.romano_create_qr_order(
    repeat('a',64),'fa','tenant-a-order-000001',repeat('c',64),
    '[{"productId":"tenant-a-product","quantity":1,"modifiers":[]}]'::jsonb,null
  );
  v_order_a:=(v_result->>'id')::uuid;

  v_result:=public.romano_create_qr_order(
    repeat('b',64),'fa','tenant-b-order-000001',repeat('d',64),
    '[{"productId":"tenant-b-product","quantity":1,"modifiers":[]}]'::jsonb,null
  );
  v_order_b:=(v_result->>'id')::uuid;

  -- A valid table token from tenant A must never resolve a tenant B product.
  begin
    perform public.romano_create_qr_order(
      repeat('a',64),'fa','tenant-a-cross-product-01',repeat('e',64),
      '[{"productId":"tenant-b-product","quantity":1,"modifiers":[]}]'::jsonb,null
    );
    raise exception 'Cross-tenant product was accepted by a tenant A table session';
  exception when invalid_parameter_value then
    null;
  end;

  -- A manager/owner of tenant A must not transition an order belonging to tenant B.
  begin
    perform public.romano_transition_order(
      v_order_b,1,'accepted',v_actor,'staff',null,'{"source":"tenant-isolation-smoke"}'::jsonb
    );
    raise exception 'Tenant A owner was allowed to transition a tenant B order';
  exception when insufficient_privilege then
    null;
  end;

  if (select status from public.orders where id=v_order_b)<>'submitted' then
    raise exception 'Unauthorized cross-tenant transition mutated tenant B order';
  end if;

  -- Positive control: the same actor can operate on their own tenant's order.
  v_result:=public.romano_transition_order(
    v_order_a,1,'accepted',v_actor,'staff',null,'{"source":"tenant-isolation-smoke"}'::jsonb
  );
  if v_result->>'status'<>'accepted' then
    raise exception 'Authorized same-tenant order transition failed: %',v_result;
  end if;
  if not exists(
    select 1 from public.audit_logs
     where restaurant_id=v_restaurant_a and actor_user_id=v_actor
       and action='order.status.changed' and entity_id=v_order_a
       and metadata->>'toStatus'='accepted'
  ) then
    raise exception 'Authorized order transition did not write its tenant-scoped audit event';
  end if;
  if exists(
    select 1 from public.audit_logs
     where restaurant_id=v_restaurant_b and entity_id=v_order_b
       and action='order.status.changed'
  ) then
    raise exception 'Rejected cross-tenant transition unexpectedly wrote an audit event';
  end if;
  if has_function_privilege('anon','public.romano_transition_order(uuid,bigint,text,uuid,text,text,jsonb)','execute')
     or has_function_privilege('authenticated','public.romano_transition_order(uuid,bigint,text,uuid,text,text,jsonb)','execute')
     or not has_function_privilege('service_role','public.romano_transition_order(uuid,bigint,text,uuid,text,text,jsonb)','execute') then
    raise exception 'Order transition RPC privileges are too broad or service role grant is missing';
  end if;
  if exists(
    select 1 from (values
      ('branches'),('branch_staff_memberships'),('restaurant_tables'),('table_sessions'),
      ('table_session_tokens'),('branch_order_counters'),('orders'),('order_items'),
      ('order_events'),('integration_outbox'),('branch_payment_gateways'),('payment_attempts')
    ) as expected(table_name)
    join pg_class c on c.oid=to_regclass('public.'||expected.table_name)
    where not c.relrowsecurity
  ) then
    raise exception 'A protected commerce table is missing row-level security';
  end if;
  if exists(
    select 1 from information_schema.role_table_grants
     where table_schema='public'
       and table_name in ('branches','branch_staff_memberships','restaurant_tables','table_sessions',
         'table_session_tokens','branch_order_counters','orders','order_items','order_events',
         'integration_outbox','branch_payment_gateways','payment_attempts')
       and grantee in ('anon','authenticated')
  ) then
    raise exception 'Browser roles unexpectedly have direct privileges on commerce tables';
  end if;

  -- Deactivated application users must lose operational access immediately.
  v_result:=public.romano_create_qr_order(
    repeat('a',64),'fa','tenant-a-inactive-user-01',repeat('f',64),
    '[{"productId":"tenant-a-product","quantity":1,"modifiers":[]}]'::jsonb,null
  );
  v_order_inactive:=(v_result->>'id')::uuid;
  update public.users set active=false where id=v_actor;
  begin
    perform public.romano_transition_order(
      v_order_inactive,1,'accepted',v_actor,'staff',null,'{"source":"inactive-user-smoke"}'::jsonb
    );
    raise exception 'A deactivated user was allowed to transition an order';
  exception when insufficient_privilege then
    null;
  end;
  if (select status from public.orders where id=v_order_inactive)<>'submitted' then
    raise exception 'Deactivated user mutated an order';
  end if;

  -- Removing a tenant membership must revoke access even if the Auth user remains active.
  update public.users set active=true where id=v_actor;
  delete from public.restaurant_memberships where restaurant_id=v_restaurant_a and user_id=v_actor;
  v_result:=public.romano_create_qr_order(
    repeat('a',64),'fa','tenant-a-unmembered-user-01',repeat('g',64),
    '[{"productId":"tenant-a-product","quantity":1,"modifiers":[]}]'::jsonb,null
  );
  v_order_unmembered:=(v_result->>'id')::uuid;
  begin
    perform public.romano_transition_order(
      v_order_unmembered,1,'accepted',v_actor,'staff',null,'{"source":"removed-membership-smoke"}'::jsonb
    );
    raise exception 'A user without tenant membership was allowed to transition an order';
  exception when insufficient_privilege then
    null;
  end;
  if (select status from public.orders where id=v_order_unmembered)<>'submitted' then
    raise exception 'User without tenant membership mutated an order';
  end if;

  if (select count(*) from public.orders where restaurant_id=v_restaurant_a)<>3
     or (select count(*) from public.orders where restaurant_id=v_restaurant_b)<>1 then
    raise exception 'Tenant order counts changed unexpectedly';
  end if;
end;
$tenant_isolation$;

rollback;
select 'ROMANO tenant isolation smoke passed' as result;
