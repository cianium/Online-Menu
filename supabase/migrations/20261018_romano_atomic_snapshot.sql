-- ROMANO: atomic, tenant-scoped admin snapshot writer.
-- Called exclusively by the server-side Edge Function with a validated Supabase Auth user.
-- Users on the public Data API cannot execute this function.
create or replace function public.romano_apply_snapshot(
  p_actor uuid,
  p_restaurant uuid,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_settings jsonb;
  v_item jsonb;
  v_tr jsonb;
  v_fields jsonb;
  v_lang text;
  v_c_slug text;
  v_p_slug text;
  v_category uuid;
  v_product uuid;
  v_cat_slugs text[] := '{}';
  v_prod_slugs text[] := '{}';
  v_mode text := coalesce(p_payload->>'mode','merge');
  v_image text;
  v_r record;
  v_saved integer := 0;
begin
  if jsonb_typeof(p_payload) <> 'object'
     or jsonb_typeof(p_payload->'categories') <> 'array'
     or jsonb_typeof(p_payload->'products') <> 'array'
     or jsonb_array_length(p_payload->'categories') > 500
     or jsonb_array_length(p_payload->'products') > 2000
     or v_mode not in ('merge','replace') then
    raise exception 'INVALID_SNAPSHOT' using errcode='22023';
  end if;
  if not exists(select 1 from public.users where id=p_actor and active) then
    raise exception 'UNAUTHENTICATED' using errcode='42501';
  end if;
  select rm.role into v_role from public.restaurant_memberships rm
   where rm.user_id=p_actor and rm.restaurant_id=p_restaurant;
  if v_role not in ('owner','manager','editor') or v_role is null then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  -- Serializes concurrent writes to the same restaurant, including deletion checks.
  select * into v_r from public.restaurants where id=p_restaurant for update;
  if not found then raise exception 'NOT_FOUND' using errcode='22023'; end if;

  v_settings := p_payload->'restaurant';
  if v_settings is not null and jsonb_typeof(v_settings) <> 'object' then
    raise exception 'INVALID_SETTINGS' using errcode='22023';
  end if;
  if v_settings is not null and v_role='editor' then
    if (v_settings ? 'name' and coalesce(v_settings->>'name','') <> coalesce(v_r.name,''))
       or (v_settings ? 'tagline' and coalesce(v_settings->>'tagline','') <> coalesce(v_r.tagline,''))
       or (v_settings ? 'description' and coalesce(v_settings->>'description','') <> coalesce(v_r.description,''))
       or (v_settings ? 'phone' and coalesce(v_settings->>'phone','') <> coalesce(v_r.phone,''))
       or (v_settings ? 'address' and coalesce(v_settings->>'address','') <> coalesce(v_r.address,''))
       or (v_settings ? 'instagram' and coalesce(v_settings->>'instagram','') <> coalesce(v_r.instagram_url,''))
       or (v_settings ? 'currency' and coalesce(v_settings->>'currency','') <> coalesce(v_r.currency,'')) then
       raise exception 'MANAGER_ACCESS_REQUIRED' using errcode='42501';
    end if;
    for v_lang, v_fields in select key,value from jsonb_each(coalesce(v_settings->'translations','{}'::jsonb))
    loop
      if v_lang not in ('en','tr','ar') or jsonb_typeof(v_fields)<>'object' then continue; end if;
      if exists(
        select 1 from jsonb_each_text(v_fields) x
         left join public.restaurant_translations t on t.restaurant_id=p_restaurant and t.language_code=v_lang
         where x.key in ('name','tagline','description','address') and btrim(x.value)<>''
           and btrim(x.value) is distinct from btrim(coalesce(
             case x.key when 'name' then t.name when 'tagline' then t.tagline
               when 'description' then t.description when 'address' then t.address end,''))
      ) then raise exception 'MANAGER_ACCESS_REQUIRED' using errcode='42501'; end if;
    end loop;
  end if;

  if v_settings is not null and v_role in ('manager','owner') and length(coalesce(v_settings->>'name','')) > 0 then
    if length(v_settings->>'name') > 120 or length(coalesce(v_settings->>'tagline',''))>180
      or length(coalesce(v_settings->>'description',''))>1200
      or length(coalesce(v_settings->>'address',''))>500
      or length(coalesce(v_settings->>'phone',''))>40 then
      raise exception 'INVALID_SETTINGS' using errcode='22023';
    end if;
    update public.restaurants set name=v_settings->>'name',
      tagline=coalesce(v_settings->>'tagline',''),description=coalesce(v_settings->>'description',''),
      phone=coalesce(v_settings->>'phone',''),address=coalesce(v_settings->>'address',''),
      instagram_url=nullif(v_settings->>'instagram',''),
      currency=coalesce(nullif(v_settings->>'currency',''),currency),updated_at=now()
      where id=p_restaurant;
    for v_lang,v_fields in select key,value from jsonb_each(coalesce(v_settings->'translations','{}'::jsonb))
    loop
      if v_lang not in ('en','tr','ar') or jsonb_typeof(v_fields)<>'object' then continue; end if;
      if nullif(btrim(coalesce(v_fields->>'name','')),'') is null
         and nullif(btrim(coalesce(v_fields->>'tagline','')),'') is null
         and nullif(btrim(coalesce(v_fields->>'description','')),'') is null
         and nullif(btrim(coalesce(v_fields->>'address','')),'') is null then continue; end if;
      insert into public.restaurant_translations(restaurant_id,language_code,name,tagline,description,address,origin)
      values(p_restaurant,v_lang,
        left(nullif(btrim(v_fields->>'name'),''),120),
        left(nullif(btrim(v_fields->>'tagline'),''),180),
        left(nullif(btrim(v_fields->>'description'),''),1200),
        left(nullif(btrim(v_fields->>'address'),''),500),'manual')
      on conflict(restaurant_id,language_code) do update set
        name=coalesce(excluded.name,public.restaurant_translations.name),
        tagline=coalesce(excluded.tagline,public.restaurant_translations.tagline),
        description=coalesce(excluded.description,public.restaurant_translations.description),
        address=coalesce(excluded.address,public.restaurant_translations.address),
        origin=case when public.restaurant_translations.name is distinct from coalesce(excluded.name,public.restaurant_translations.name)
                     or public.restaurant_translations.tagline is distinct from coalesce(excluded.tagline,public.restaurant_translations.tagline)
                     or public.restaurant_translations.description is distinct from coalesce(excluded.description,public.restaurant_translations.description)
                     or public.restaurant_translations.address is distinct from coalesce(excluded.address,public.restaurant_translations.address)
                    then 'manual' else public.restaurant_translations.origin end;
    end loop;
  end if;

  for v_item in select value from jsonb_array_elements(p_payload->'categories') loop
    v_c_slug := v_item->>'id';
    if v_c_slug is null or length(v_c_slug)>80 or v_c_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      or coalesce(length(v_item->>'name'),0) not between 1 and 120
      or v_c_slug=any(v_cat_slugs) then
      raise exception 'INVALID_OR_DUPLICATE_CATEGORY' using errcode='22023';
    end if;
    v_cat_slugs := array_append(v_cat_slugs,v_c_slug);
    v_image := nullif(v_item->>'image','');
    if v_image is not null and (length(v_image)>2000
      or (v_image !~* '^https?://' and v_image !~ '^/?(assets|uploads)/[a-zA-Z0-9_./-]+$')
      or v_image like '%..%') then raise exception 'INVALID_IMAGE' using errcode='22023'; end if;
    insert into public.categories(restaurant_id,slug,image_url,sort_order,active)
     values(p_restaurant,v_c_slug,v_image,coalesce((v_item->>'sortOrder')::integer,0),
       coalesce((v_item->>'active')::boolean,true))
     on conflict(restaurant_id,slug) do update
       set image_url=excluded.image_url,sort_order=excluded.sort_order,active=excluded.active,updated_at=now()
     returning id into v_category;
    insert into public.category_translations(category_id,language_code,name,origin)
      values(v_category,'fa',v_item->>'name','source')
      on conflict(category_id,language_code) do update set
       name=excluded.name,
       origin=case when public.category_translations.name is distinct from excluded.name then 'source'
                   else public.category_translations.origin end;
    for v_lang,v_fields in select key,value from jsonb_each(coalesce(v_item->'translations','{}'::jsonb))
    loop
      if v_lang not in ('en','tr','ar') or jsonb_typeof(v_fields)<>'object'
         or nullif(btrim(coalesce(v_fields->>'name','')),'') is null then continue; end if;
      insert into public.category_translations(category_id,language_code,name,origin)
      values(v_category,v_lang,left(btrim(v_fields->>'name'),160),'manual')
      on conflict(category_id,language_code) do update set name=excluded.name,
        origin=case when public.category_translations.name is distinct from excluded.name then 'manual'
                    else public.category_translations.origin end;
    end loop;
  end loop;

  for v_item in select value from jsonb_array_elements(p_payload->'products') loop
    v_p_slug := v_item->>'id';
    v_c_slug := v_item->>'category';
    if v_p_slug is null or length(v_p_slug)>80 or v_p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      or coalesce(length(v_item->>'name'),0) not between 1 and 160
      or v_p_slug=any(v_prod_slugs)
      or v_c_slug is null or not (v_c_slug=any(v_cat_slugs)) then
      raise exception 'INVALID_OR_DUPLICATE_PRODUCT' using errcode='22023';
    end if;
    v_prod_slugs := array_append(v_prod_slugs,v_p_slug);
    select id into v_category from public.categories where restaurant_id=p_restaurant and slug=v_c_slug;
    if v_category is null then raise exception 'INVALID_CATEGORY' using errcode='22023'; end if;
    v_image := nullif(v_item->>'image','');
    if v_image is not null and (length(v_image)>2000
      or (v_image !~* '^https?://' and v_image !~ '^/?(assets|uploads)/[a-zA-Z0-9_./-]+$')
      or v_image like '%..%') then raise exception 'INVALID_IMAGE' using errcode='22023'; end if;
    if (v_item->>'price')::numeric < 0 or (v_item->>'price')::numeric > 100000000000
       or length(coalesce(v_item->>'description',''))>2500 or length(coalesce(v_item->>'badge',''))>80 then
      raise exception 'INVALID_PRODUCT' using errcode='22023'; end if;
    insert into public.products(restaurant_id,category_id,slug,price,image_url,badge_code,rating,featured,active,sort_order)
      values(p_restaurant,v_category,v_p_slug,(v_item->>'price')::numeric,v_image,
       nullif(v_item->>'badge',''),least(5,greatest(0,
        case when jsonb_typeof(v_item->'rating')='number' then (v_item->>'rating')::numeric
             when v_item->>'rating' ~ '★' then length(v_item->>'rating') - length(replace(v_item->>'rating','★',''))
             else 0 end)),
       coalesce((v_item->>'featured')::boolean,false),coalesce((v_item->>'active')::boolean,true),
       coalesce((v_item->>'sortOrder')::integer,0))
     on conflict(restaurant_id,slug) do update set
       category_id=excluded.category_id,price=excluded.price,image_url=excluded.image_url,
       badge_code=excluded.badge_code,rating=excluded.rating,featured=excluded.featured,
       active=excluded.active,sort_order=excluded.sort_order,updated_at=now()
     returning id into v_product;
    insert into public.product_translations(product_id,language_code,name,description,badge_label,origin)
      values(v_product,'fa',v_item->>'name',coalesce(v_item->>'description',''),
        coalesce(v_item->>'badge',''),'source')
     on conflict(product_id,language_code) do update set
       name=excluded.name,description=excluded.description,badge_label=excluded.badge_label,
       origin=case when public.product_translations.name is distinct from excluded.name
                     or public.product_translations.description is distinct from excluded.description
                     or public.product_translations.badge_label is distinct from excluded.badge_label
                  then 'source' else public.product_translations.origin end;
    for v_lang,v_fields in select key,value from jsonb_each(coalesce(v_item->'translations','{}'::jsonb))
    loop
      if v_lang not in ('en','tr','ar') or jsonb_typeof(v_fields)<>'object'
        or nullif(btrim(coalesce(v_fields->>'name','')),'') is null then continue; end if;
      insert into public.product_translations(product_id,language_code,name,description,badge_label,origin)
      values(v_product,v_lang,left(btrim(v_fields->>'name'),160),
        left(coalesce(v_fields->>'description',''),2500),left(coalesce(v_fields->>'badge',''),80),'manual')
      on conflict(product_id,language_code) do update set
        name=excluded.name,
        description=coalesce(nullif(excluded.description,''),public.product_translations.description),
        badge_label=coalesce(nullif(excluded.badge_label,''),public.product_translations.badge_label),
        origin=case when public.product_translations.name is distinct from excluded.name
                     or public.product_translations.description is distinct from coalesce(nullif(excluded.description,''),public.product_translations.description)
                     or public.product_translations.badge_label is distinct from coalesce(nullif(excluded.badge_label,''),public.product_translations.badge_label)
                    then 'manual' else public.product_translations.origin end;
    end loop;
    v_saved := v_saved+1;
  end loop;

  if v_mode='replace' then
    if v_role='editor' and (
      exists(select 1 from public.products where restaurant_id=p_restaurant and not(slug=any(v_prod_slugs)))
      or exists(select 1 from public.categories where restaurant_id=p_restaurant and not(slug=any(v_cat_slugs)))
    ) then raise exception 'MANAGER_ACCESS_REQUIRED' using errcode='42501'; end if;
    delete from public.products where restaurant_id=p_restaurant and not(slug=any(v_prod_slugs));
    delete from public.categories where restaurant_id=p_restaurant and not(slug=any(v_cat_slugs));
  end if;

  insert into public.audit_logs(restaurant_id,actor_user_id,action,entity_type,entity_id,metadata)
     values(p_restaurant,p_actor,'menu.snapshot.saved','restaurant',p_restaurant,
       jsonb_build_object('mode',v_mode,'categories',array_length(v_cat_slugs,1),
          'products',v_saved));
  return jsonb_build_object('saved',true,'categories',coalesce(array_length(v_cat_slugs,1),0),'products',v_saved);
end;
$$;

revoke all on function public.romano_apply_snapshot(uuid,uuid,jsonb) from public;
revoke all on function public.romano_apply_snapshot(uuid,uuid,jsonb) from anon;
revoke all on function public.romano_apply_snapshot(uuid,uuid,jsonb) from authenticated;
grant execute on function public.romano_apply_snapshot(uuid,uuid,jsonb) to service_role;
notify pgrst, 'reload schema';
