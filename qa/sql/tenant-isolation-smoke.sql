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

  if (select count(*) from public.orders where restaurant_id=v_restaurant_a)<>1
     or (select count(*) from public.orders where restaurant_id=v_restaurant_b)<>1 then
    raise exception 'Tenant order counts changed unexpectedly';
  end if;
end;
$tenant_isolation$;

rollback;
select 'ROMANO tenant isolation smoke passed' as result;
