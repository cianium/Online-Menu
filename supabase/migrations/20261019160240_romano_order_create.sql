-- Atomic customer ordering primitives. These functions are called only by the
-- romano-order Edge Function with a server-side secret. Browser roles receive
-- no table or function privileges.

create or replace function public.romano_order_payload(p_order uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'orderNumber', o.order_number,
    'status', o.status,
    'version', o.version,
    'language', o.display_language,
    'currencyCode', o.currency_code,
    'currencyExponent', o.currency_exponent,
    'subtotalMinor', o.subtotal_minor,
    'discountMinor', o.discount_minor,
    'taxMinor', o.tax_minor,
    'serviceMinor', o.service_minor,
    'totalMinor', o.total_minor,
    'notes', o.notes,
    'submittedAt', o.submitted_at,
    'updatedAt', o.updated_at,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'productId', oi.product_slug,
          'name', oi.product_name,
          'quantity', oi.quantity,
          'unitPriceMinor', oi.unit_price_minor,
          'modifierTotalMinor', oi.modifier_total_minor,
          'discountMinor', oi.discount_minor,
          'lineTotalMinor', oi.line_total_minor,
          'modifiers', oi.modifiers,
          'notes', oi.notes
        ) order by oi.created_at, oi.id
      )
      from public.order_items oi
      where oi.restaurant_id = o.restaurant_id
        and oi.branch_id = o.branch_id
        and oi.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = p_order;
$$;

create or replace function public.romano_open_table_session(
  p_branch uuid,
  p_table uuid,
  p_qr_version integer,
  p_token_hash text,
  p_ttl_seconds integer default 14400
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_table record;
  v_session public.table_sessions%rowtype;
  v_expiry timestamptz;
  v_created boolean := false;
begin
  if p_branch is null
     or p_table is null
     or p_qr_version is null
     or p_qr_version < 1
     or p_token_hash !~ '^[a-f0-9]{64}$'
     or p_ttl_seconds not between 900 and 43200 then
    raise exception 'INVALID_TABLE_SESSION_REQUEST' using errcode = '22023';
  end if;

  -- Locking the table serializes scans and prevents two open sessions from
  -- racing for the same physical table.
  select
    t.restaurant_id,
    t.branch_id,
    t.id as table_id,
    t.code as table_code,
    t.display_name as table_name,
    t.qr_version,
    t.active as table_active,
    b.slug as branch_slug,
    b.name as branch_name,
    b.active as branch_active,
    b.qr_ordering_enabled,
    r.slug as restaurant_slug,
    r.published as restaurant_published
  into v_table
  from public.restaurant_tables t
  join public.branches b
    on b.restaurant_id = t.restaurant_id and b.id = t.branch_id
  join public.restaurants r on r.id = t.restaurant_id
  where t.branch_id = p_branch and t.id = p_table
  for update of t;

  if not found
     or not v_table.table_active
     or not v_table.branch_active
     or not v_table.qr_ordering_enabled
     or not v_table.restaurant_published
     or v_table.qr_version <> p_qr_version then
    raise exception 'QR_TABLE_NOT_AVAILABLE' using errcode = '22023';
  end if;

  select s.* into v_session
  from public.table_sessions s
  where s.restaurant_id = v_table.restaurant_id
    and s.branch_id = v_table.branch_id
    and s.table_id = v_table.table_id
    and s.status in ('open', 'closing')
  for update;

  if found and v_session.expires_at <= now() then
    update public.table_sessions
       set status = 'closed', closed_at = now(), last_activity_at = now(), version = version + 1
     where id = v_session.id;
    v_session := null;
  elsif found and v_session.status = 'closing' then
    raise exception 'TABLE_SESSION_CLOSING' using errcode = '55000';
  end if;

  v_expiry := now() + make_interval(secs => p_ttl_seconds);
  if v_session.id is null then
    insert into public.table_sessions(
      restaurant_id, branch_id, table_id, opened_source, expires_at
    ) values (
      v_table.restaurant_id, v_table.branch_id, v_table.table_id, 'qr', v_expiry
    ) returning * into v_session;
    v_created := true;
  else
    update public.table_sessions
       set expires_at = greatest(expires_at, v_expiry),
           last_activity_at = now(),
           version = version + 1
     where id = v_session.id
     returning * into v_session;
  end if;

  insert into public.table_session_tokens(
    restaurant_id, branch_id, table_session_id, token_hash, expires_at
  ) values (
    v_session.restaurant_id, v_session.branch_id, v_session.id, p_token_hash, v_expiry
  );

  if v_created then
    insert into public.integration_outbox(
      restaurant_id, branch_id, aggregate_type, aggregate_id,
      event_type, payload, idempotency_key
    ) values (
      v_session.restaurant_id, v_session.branch_id, 'table_session', v_session.id,
      'table_session.opened',
      jsonb_build_object(
        'sessionId', v_session.id,
        'tableId', v_session.table_id,
        'openedAt', v_session.opened_at
      ),
      'table-session:' || v_session.id::text || ':opened'
    );
  end if;

  return jsonb_build_object(
    'sessionId', v_session.id,
    'sessionExpiresAt', v_session.expires_at,
    'accessExpiresAt', v_expiry,
    'restaurant', jsonb_build_object('slug', v_table.restaurant_slug),
    'branch', jsonb_build_object(
      'id', v_table.branch_id,
      'slug', v_table.branch_slug,
      'name', v_table.branch_name
    ),
    'table', jsonb_build_object(
      'id', v_table.table_id,
      'code', v_table.table_code,
      'name', v_table.table_name
    )
  );
end;
$$;

create or replace function public.romano_create_qr_order(
  p_session_token_hash text,
  p_display_language text,
  p_idempotency_key text,
  p_request_fingerprint text,
  p_items jsonb,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.table_sessions%rowtype;
  v_branch public.branches%rowtype;
  v_order public.orders%rowtype;
  v_item jsonb;
  v_product record;
  v_product_slug text;
  v_product_slugs text[] := '{}';
  v_quantity smallint;
  v_item_notes text;
  v_unit_numeric numeric;
  v_unit_minor bigint;
  v_line_minor bigint;
  v_subtotal numeric := 0;
  v_resolved_items jsonb := '[]'::jsonb;
  v_order_number bigint;
  v_result jsonb;
begin
  if p_session_token_hash !~ '^[a-f0-9]{64}$'
     or p_display_language not in ('fa', 'en', 'tr', 'ar')
     or char_length(coalesce(p_idempotency_key, '')) not between 16 and 160
     or p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]+$'
     or p_request_fingerprint !~ '^[a-f0-9]{64}$'
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 50
     or char_length(coalesce(p_notes, '')) > 1000 then
    raise exception 'INVALID_ORDER_REQUEST' using errcode = '22023';
  end if;

  select s.* into v_session
  from public.table_session_tokens st
  join public.table_sessions s
    on s.restaurant_id = st.restaurant_id
   and s.branch_id = st.branch_id
   and s.id = st.table_session_id
  where st.token_hash = p_session_token_hash
    and st.revoked_at is null
    and st.expires_at > now()
    and s.status = 'open'
    and s.expires_at > now()
  for update of s;
  if not found then
    raise exception 'TABLE_SESSION_INVALID_OR_EXPIRED' using errcode = '42501';
  end if;

  select * into v_branch
  from public.branches b
  where b.restaurant_id = v_session.restaurant_id
    and b.id = v_session.branch_id
    and b.active
    and b.qr_ordering_enabled
    and b.currency_code is not null
    and b.currency_exponent is not null
    and b.menu_price_to_minor_multiplier is not null
  for share;
  if not found then
    raise exception 'QR_ORDERING_NOT_AVAILABLE' using errcode = '55000';
  end if;

  -- Serialize equal idempotency keys before checking/inserting. The database
  -- unique constraint remains the final backstop.
  perform pg_advisory_xact_lock(
    hashtextextended(v_session.restaurant_id::text || ':' || p_idempotency_key, 0)
  );

  select * into v_order
  from public.orders o
  where o.restaurant_id = v_session.restaurant_id
    and o.idempotency_key = p_idempotency_key;
  if found then
    if v_order.request_fingerprint <> p_request_fingerprint
       or v_order.table_session_id <> v_session.id then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '22023';
    end if;
    return public.romano_order_payload(v_order.id)
      || jsonb_build_object('idempotentReplay', true);
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object'
       or jsonb_typeof(v_item->'productId') <> 'string'
       or jsonb_typeof(v_item->'quantity') <> 'number'
       or (v_item ? 'notes' and jsonb_typeof(v_item->'notes') not in ('string', 'null'))
       or (v_item ? 'modifiers' and (
         jsonb_typeof(v_item->'modifiers') <> 'array'
         or jsonb_array_length(v_item->'modifiers') <> 0
       )) then
      raise exception 'INVALID_ORDER_ITEM' using errcode = '22023';
    end if;

    v_product_slug := v_item->>'productId';
    if v_product_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
       or char_length(v_product_slug) > 80
       or v_product_slug = any(v_product_slugs)
       or (v_item->>'quantity') !~ '^[1-9][0-9]?$' then
      raise exception 'INVALID_OR_DUPLICATE_ORDER_ITEM' using errcode = '22023';
    end if;
    v_product_slugs := array_append(v_product_slugs, v_product_slug);
    v_quantity := (v_item->>'quantity')::smallint;
    v_item_notes := nullif(btrim(coalesce(v_item->>'notes', '')), '');
    if char_length(coalesce(v_item_notes, '')) > 500 then
      raise exception 'INVALID_ORDER_ITEM_NOTES' using errcode = '22023';
    end if;

    select
      p.id,
      p.slug,
      p.price,
      coalesce((
        select pt.name
        from public.product_translations pt
        where pt.product_id = p.id
          and pt.language_code in (p_display_language, 'fa')
        order by case when pt.language_code = p_display_language then 0 else 1 end
        limit 1
      ), p.slug) as product_name
    into v_product
    from public.products p
    join public.categories c
      on c.id = p.category_id
     and c.restaurant_id = p.restaurant_id
     and c.active
    where p.restaurant_id = v_session.restaurant_id
      and p.slug = v_product_slug
      and p.active;
    if not found then
      raise exception 'PRODUCT_NOT_AVAILABLE:%', v_product_slug using errcode = '22023';
    end if;

    v_unit_numeric := v_product.price * v_branch.menu_price_to_minor_multiplier;
    if v_unit_numeric < 0
       or v_unit_numeric <> trunc(v_unit_numeric)
       or v_unit_numeric > 9223372036854775807::numeric then
      raise exception 'CATALOG_PRICE_NOT_REPRESENTABLE:%', v_product_slug using errcode = '22003';
    end if;
    v_unit_minor := v_unit_numeric::bigint;
    if v_unit_numeric * v_quantity > 9223372036854775807::numeric then
      raise exception 'ORDER_LINE_TOTAL_OVERFLOW' using errcode = '22003';
    end if;
    v_line_minor := (v_unit_numeric * v_quantity)::bigint;
    v_subtotal := v_subtotal + v_line_minor;
    if v_subtotal > 9223372036854775807::numeric then
      raise exception 'ORDER_TOTAL_OVERFLOW' using errcode = '22003';
    end if;

    v_resolved_items := v_resolved_items || jsonb_build_array(jsonb_build_object(
      'productUuid', v_product.id,
      'productId', v_product.slug,
      'name', left(v_product.product_name, 160),
      'quantity', v_quantity,
      'unitPriceMinor', v_unit_minor,
      'lineTotalMinor', v_line_minor,
      'notes', v_item_notes
    ));
  end loop;

  insert into public.branch_order_counters(restaurant_id, branch_id, next_order_number)
  values (v_session.restaurant_id, v_session.branch_id, 2)
  on conflict (branch_id) do update
    set next_order_number = public.branch_order_counters.next_order_number + 1,
        updated_at = now()
    where public.branch_order_counters.restaurant_id = excluded.restaurant_id
  returning next_order_number - 1 into v_order_number;
  if v_order_number is null then
    raise exception 'ORDER_COUNTER_TENANT_MISMATCH' using errcode = '55000';
  end if;

  insert into public.orders(
    restaurant_id, branch_id, table_session_id, order_number, channel,
    display_language, currency_code, currency_exponent,
    subtotal_minor, total_minor, notes, idempotency_key, request_fingerprint
  ) values (
    v_session.restaurant_id, v_session.branch_id, v_session.id, v_order_number, 'qr_dine_in',
    p_display_language, v_branch.currency_code, v_branch.currency_exponent,
    v_subtotal::bigint, v_subtotal::bigint,
    nullif(btrim(coalesce(p_notes, '')), ''), p_idempotency_key, p_request_fingerprint
  ) returning * into v_order;

  for v_item in select value from jsonb_array_elements(v_resolved_items)
  loop
    insert into public.order_items(
      restaurant_id, branch_id, order_id, product_id, product_slug, product_name,
      quantity, unit_price_minor, line_total_minor, notes
    ) values (
      v_order.restaurant_id, v_order.branch_id, v_order.id,
      (v_item->>'productUuid')::uuid, v_item->>'productId', v_item->>'name',
      (v_item->>'quantity')::smallint, (v_item->>'unitPriceMinor')::bigint,
      (v_item->>'lineTotalMinor')::bigint, nullif(v_item->>'notes', '')
    );
  end loop;

  insert into public.order_events(
    restaurant_id, branch_id, order_id, from_status, to_status,
    actor_type, metadata
  ) values (
    v_order.restaurant_id, v_order.branch_id, v_order.id, null, 'submitted',
    'customer', jsonb_build_object('channel', 'qr_dine_in')
  );

  insert into public.integration_outbox(
    restaurant_id, branch_id, aggregate_type, aggregate_id,
    event_type, payload, idempotency_key
  ) values (
    v_order.restaurant_id, v_order.branch_id, 'order', v_order.id,
    'order.submitted',
    jsonb_build_object(
      'orderId', v_order.id,
      'orderNumber', v_order.order_number,
      'tableSessionId', v_order.table_session_id,
      'status', v_order.status,
      'totalMinor', v_order.total_minor,
      'currencyCode', v_order.currency_code
    ),
    'order:' || v_order.id::text || ':submitted'
  );

  insert into public.audit_logs(
    restaurant_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    v_order.restaurant_id, null, 'order.submitted', 'order', v_order.id,
    jsonb_build_object(
      'branchId', v_order.branch_id,
      'channel', v_order.channel,
      'itemCount', jsonb_array_length(v_resolved_items)
    )
  );

  update public.table_sessions
     set last_activity_at = now(), version = version + 1
   where id = v_session.id;
  update public.table_session_tokens
     set last_seen_at = now()
   where token_hash = p_session_token_hash;

  if v_branch.auto_accept_qr_orders then
    perform public.romano_transition_order(
      v_order.id, v_order.version, 'accepted', null, 'system', null,
      jsonb_build_object('source', 'auto_accept')
    );
  end if;

  v_result := public.romano_order_payload(v_order.id);
  return v_result || jsonb_build_object('idempotentReplay', false);
end;
$$;

create or replace function public.romano_get_qr_order(
  p_session_token_hash text,
  p_order uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session uuid;
  v_order_session uuid;
  v_result jsonb;
  v_events jsonb;
begin
  if p_session_token_hash !~ '^[a-f0-9]{64}$' or p_order is null then
    raise exception 'ORDER_NOT_FOUND' using errcode = '22023';
  end if;

  select s.id into v_session
  from public.table_session_tokens st
  join public.table_sessions s
    on s.restaurant_id = st.restaurant_id
   and s.branch_id = st.branch_id
   and s.id = st.table_session_id
  where st.token_hash = p_session_token_hash
    and st.revoked_at is null
    and st.expires_at > now()
    and s.status in ('open', 'closing')
    and s.expires_at > now();

  select o.table_session_id into v_order_session
  from public.orders o
  where o.id = p_order;
  if v_session is null or v_order_session is null or v_order_session <> v_session then
    raise exception 'ORDER_NOT_FOUND' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'fromStatus', e.from_status,
      'toStatus', e.to_status,
      'createdAt', e.created_at
    ) order by e.created_at, e.id
  ), '[]'::jsonb) into v_events
  from public.order_events e
  where e.order_id = p_order;

  update public.table_session_tokens
     set last_seen_at = now()
   where token_hash = p_session_token_hash;

  v_result := public.romano_order_payload(p_order);
  return v_result || jsonb_build_object('events', v_events);
end;
$$;

revoke all on function public.romano_order_payload(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.romano_open_table_session(uuid, uuid, integer, text, integer)
  from public, anon, authenticated;
revoke all on function public.romano_create_qr_order(text, text, text, text, jsonb, text)
  from public, anon, authenticated;
revoke all on function public.romano_get_qr_order(text, uuid)
  from public, anon, authenticated;

grant execute on function public.romano_open_table_session(uuid, uuid, integer, text, integer)
  to service_role;
grant execute on function public.romano_create_qr_order(text, text, text, text, jsonb, text)
  to service_role;
grant execute on function public.romano_get_qr_order(text, uuid)
  to service_role;

notify pgrst, 'reload schema';
