-- ROMANO MVP order core.
-- Tenant-bound timestamp trigger. The live Supabase schema does not include
-- the legacy Fastify-only public.set_updated_at() helper.
create or replace function public.romano_orders_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $romano_touch$
begin
  new.updated_at := now();
  return new;
end;
$romano_touch$;
revoke all on function public.romano_orders_touch_updated_at() from public, anon, authenticated;

--
-- This migration deliberately does not seed a branch or enable QR ordering.
-- Production currently stores IRR while the UI labels prices as Toman; every
-- branch must explicitly define its money conversion before ordering can be
-- enabled. Public browsers never receive table privileges. Edge Functions use
-- the service role and the restricted RPCs below.

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  timezone text not null default 'Asia/Tehran' check (char_length(timezone) between 1 and 80),
  address text check (address is null or char_length(address) <= 500),
  phone text check (phone is null or char_length(phone) <= 40),
  active boolean not null default true,
  qr_ordering_enabled boolean not null default false,
  auto_accept_qr_orders boolean not null default false,
  currency_code text check (currency_code is null or currency_code ~ '^[A-Z]{3}$'),
  currency_exponent smallint check (currency_exponent is null or currency_exponent between 0 and 3),
  menu_price_to_minor_multiplier integer check (
    menu_price_to_minor_multiplier is null or menu_price_to_minor_multiplier between 1 and 1000
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, slug),
  unique (restaurant_id, id),
  check (
    (currency_code is null and currency_exponent is null and menu_price_to_minor_multiplier is null)
    or
    (currency_code is not null and currency_exponent is not null and menu_price_to_minor_multiplier is not null)
  ),
  check (
    not qr_ordering_enabled
    or (active and currency_code is not null and currency_exponent is not null and menu_price_to_minor_multiplier is not null)
  ),
  check (not auto_accept_qr_orders or qr_ordering_enabled)
);

comment on column public.branches.menu_price_to_minor_multiplier is
  'Multiplier from the catalog numeric price to canonical minor units; configure explicitly before enabling QR orders.';

create table public.branch_staff_memberships (
  restaurant_id uuid not null,
  branch_id uuid not null,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('manager', 'cashier', 'waiter', 'kitchen', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (branch_id, user_id),
  foreign key (restaurant_id, branch_id)
    references public.branches(restaurant_id, id) on delete cascade
);

create table public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  branch_id uuid not null,
  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  capacity smallint check (capacity is null or capacity between 1 and 100),
  qr_version integer not null default 1 check (qr_version > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, code),
  unique (restaurant_id, branch_id, id),
  foreign key (restaurant_id, branch_id)
    references public.branches(restaurant_id, id) on delete cascade
);

comment on column public.restaurant_tables.qr_version is
  'Included in the server-signed QR payload. Incrementing it revokes previously generated table QR codes.';

create table public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  branch_id uuid not null,
  table_id uuid not null,
  status text not null default 'open' check (status in ('open', 'closing', 'closed', 'cancelled')),
  guest_count smallint check (guest_count is null or guest_count between 1 and 100),
  opened_source text not null check (opened_source in ('qr', 'staff', 'system')),
  opened_by_user_id uuid references public.users(id) on delete set null,
  opened_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  expires_at timestamptz not null,
  closed_at timestamptz,
  version bigint not null default 1 check (version > 0),
  unique (restaurant_id, branch_id, id),
  foreign key (restaurant_id, branch_id, table_id)
    references public.restaurant_tables(restaurant_id, branch_id, id) on delete restrict,
  check (expires_at > opened_at),
  check (
    (status in ('open', 'closing') and closed_at is null)
    or (status in ('closed', 'cancelled') and closed_at is not null)
  )
);

create table public.table_session_tokens (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  branch_id uuid not null,
  table_session_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  foreign key (restaurant_id, branch_id, table_session_id)
    references public.table_sessions(restaurant_id, branch_id, id) on delete cascade,
  check (expires_at > created_at),
  check (revoked_at is null or revoked_at >= created_at)
);

create table public.branch_order_counters (
  restaurant_id uuid not null,
  branch_id uuid primary key,
  next_order_number bigint not null default 1 check (next_order_number > 0),
  updated_at timestamptz not null default now(),
  foreign key (restaurant_id, branch_id)
    references public.branches(restaurant_id, id) on delete cascade
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  branch_id uuid not null,
  table_session_id uuid,
  order_number bigint not null check (order_number > 0),
  channel text not null check (channel in ('qr_dine_in', 'staff_dine_in', 'takeaway', 'walk_in')),
  status text not null default 'submitted' check (
    status in ('submitted', 'accepted', 'preparing', 'ready', 'served', 'delivered', 'completed', 'rejected', 'cancelled')
  ),
  display_language text not null default 'fa' check (display_language in ('fa', 'en', 'tr', 'ar')),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  currency_exponent smallint not null check (currency_exponent between 0 and 3),
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  tax_minor bigint not null default 0 check (tax_minor >= 0),
  service_minor bigint not null default 0 check (service_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  notes text check (notes is null or char_length(notes) <= 1000),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 160),
  request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  created_by_user_id uuid references public.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  served_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1 check (version > 0),
  unique (branch_id, order_number),
  unique (restaurant_id, idempotency_key),
  unique (restaurant_id, branch_id, id),
  foreign key (restaurant_id, branch_id)
    references public.branches(restaurant_id, id) on delete restrict,
  foreign key (restaurant_id, branch_id, table_session_id)
    references public.table_sessions(restaurant_id, branch_id, id) on delete restrict,
  check (
    (channel in ('qr_dine_in', 'staff_dine_in') and table_session_id is not null)
    or (channel in ('takeaway', 'walk_in') and table_session_id is null)
  ),
  check (total_minor = greatest(0::bigint, subtotal_minor - discount_minor + tax_minor + service_minor))
);

alter table public.products
  add constraint products_restaurant_id_id_key unique (restaurant_id, id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  branch_id uuid not null,
  order_id uuid not null,
  product_id uuid,
  product_slug text not null check (char_length(product_slug) between 1 and 80),
  product_name text not null check (char_length(btrim(product_name)) between 1 and 160),
  quantity smallint not null check (quantity between 1 and 99),
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  modifier_total_minor bigint not null default 0 check (modifier_total_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  line_total_minor bigint not null check (line_total_minor >= 0),
  modifiers jsonb not null default '[]'::jsonb check (jsonb_typeof(modifiers) = 'array'),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (restaurant_id, branch_id, order_id)
    references public.orders(restaurant_id, branch_id, id) on delete cascade,
  foreign key (restaurant_id, product_id)
    references public.products(restaurant_id, id) on delete set null (product_id),
  check (
    line_total_minor = greatest(
      0::bigint,
      ((unit_price_minor + modifier_total_minor) * quantity::bigint) - discount_minor
    )
  )
);

create table public.order_events (
  id bigint generated always as identity primary key,
  restaurant_id uuid not null,
  branch_id uuid not null,
  order_id uuid not null,
  from_status text check (
    from_status is null
    or from_status in ('submitted', 'accepted', 'preparing', 'ready', 'served', 'delivered', 'completed', 'rejected', 'cancelled')
  ),
  to_status text not null check (
    to_status in ('submitted', 'accepted', 'preparing', 'ready', 'served', 'delivered', 'completed', 'rejected', 'cancelled')
  ),
  actor_type text not null check (actor_type in ('customer', 'staff', 'system')),
  actor_user_id uuid references public.users(id) on delete set null,
  reason text check (reason is null or char_length(reason) <= 500),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (restaurant_id, branch_id, order_id)
    references public.orders(restaurant_id, branch_id, id) on delete restrict
);

create table public.integration_outbox (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  branch_id uuid not null,
  aggregate_type text not null check (aggregate_type in ('order', 'table_session')),
  aggregate_id uuid not null,
  event_type text not null check (char_length(event_type) between 3 and 120),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status text not null default 'pending' check (status in ('pending', 'processing', 'delivered', 'failed', 'dead')),
  attempts smallint not null default 0 check (attempts between 0 and 100),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text check (locked_by is null or char_length(locked_by) <= 160),
  last_error text check (last_error is null or char_length(last_error) <= 2000),
  idempotency_key text not null unique check (char_length(idempotency_key) between 16 and 240),
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  foreign key (restaurant_id, branch_id)
    references public.branches(restaurant_id, id) on delete cascade
);

-- Cover foreign keys and the hot operational queries. Terminal orders are kept
-- out of the active queue index so it remains small as history grows.
create index branch_staff_user_idx on public.branch_staff_memberships(user_id);
create index branch_staff_tenant_branch_idx
  on public.branch_staff_memberships(restaurant_id, branch_id);
create index restaurant_tables_tenant_branch_active_idx
  on public.restaurant_tables(restaurant_id, branch_id, active, code);
create index table_sessions_table_idx on public.table_sessions(table_id);
create index table_sessions_tenant_table_idx
  on public.table_sessions(restaurant_id, branch_id, table_id);
create unique index table_sessions_one_open_per_table_idx
  on public.table_sessions(table_id)
  where status in ('open', 'closing');
create index table_sessions_tenant_branch_status_idx
  on public.table_sessions(restaurant_id, branch_id, status, opened_at desc);
create index table_sessions_opened_by_idx on public.table_sessions(opened_by_user_id)
  where opened_by_user_id is not null;
create index table_session_tokens_session_idx
  on public.table_session_tokens(restaurant_id, branch_id, table_session_id);
create index table_session_tokens_active_expiry_idx
  on public.table_session_tokens(expires_at)
  where revoked_at is null;
create index branch_order_counters_tenant_branch_idx
  on public.branch_order_counters(restaurant_id, branch_id);
create index orders_tenant_session_idx on public.orders(restaurant_id, branch_id, table_session_id)
  where table_session_id is not null;
create index orders_created_by_idx on public.orders(created_by_user_id)
  where created_by_user_id is not null;
create index orders_active_queue_idx on public.orders(restaurant_id, branch_id, created_at, id)
  where status in ('submitted', 'accepted', 'preparing', 'ready', 'served', 'delivered');
create index order_items_tenant_order_idx
  on public.order_items(restaurant_id, branch_id, order_id, created_at, id);
create index order_items_tenant_product_idx on public.order_items(restaurant_id, product_id)
  where product_id is not null;
create index order_events_tenant_order_idx
  on public.order_events(restaurant_id, branch_id, order_id, created_at, id);
create index order_events_actor_idx on public.order_events(actor_user_id)
  where actor_user_id is not null;
create index integration_outbox_pending_idx on public.integration_outbox(available_at, created_at, id)
  where status in ('pending', 'failed');
create index integration_outbox_tenant_branch_idx
  on public.integration_outbox(restaurant_id, branch_id, created_at desc);

create trigger branches_updated_at
before update on public.branches
for each row execute function public.romano_orders_touch_updated_at();

create trigger branch_staff_memberships_updated_at
before update on public.branch_staff_memberships
for each row execute function public.romano_orders_touch_updated_at();

create trigger restaurant_tables_updated_at
before update on public.restaurant_tables
for each row execute function public.romano_orders_touch_updated_at();

create trigger order_items_updated_at
before update on public.order_items
for each row execute function public.romano_orders_touch_updated_at();

create trigger orders_updated_at
before update on public.orders
for each row execute function public.romano_orders_touch_updated_at();

create or replace function public.romano_reject_order_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'ORDER_EVENTS_ARE_IMMUTABLE' using errcode = '55000';
end;
$$;

create trigger order_events_immutable
before update or delete on public.order_events
for each row execute function public.romano_reject_order_event_mutation();

create or replace function public.romano_guard_order_item_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_order_id uuid := coalesce(new.order_id, old.order_id);
  v_status text;
begin
  select o.status into v_status
    from public.orders o
   where o.id = v_order_id;
  if v_status is distinct from 'submitted'
     and current_setting('romano.order_item_amendment', true) is distinct from 'allowed' then
    raise exception 'ORDER_ITEMS_LOCKED' using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger order_items_guard
before insert or update or delete on public.order_items
for each row execute function public.romano_guard_order_item_mutation();

create or replace function public.romano_guard_order_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.restaurant_id is distinct from old.restaurant_id
     or new.branch_id is distinct from old.branch_id
     or new.table_session_id is distinct from old.table_session_id
     or new.order_number is distinct from old.order_number
     or new.channel is distinct from old.channel
     or new.display_language is distinct from old.display_language
     or new.currency_code is distinct from old.currency_code
     or new.currency_exponent is distinct from old.currency_exponent
     or new.subtotal_minor is distinct from old.subtotal_minor
     or new.discount_minor is distinct from old.discount_minor
     or new.tax_minor is distinct from old.tax_minor
     or new.service_minor is distinct from old.service_minor
     or new.total_minor is distinct from old.total_minor
     or new.notes is distinct from old.notes
     or new.idempotency_key is distinct from old.idempotency_key
     or new.request_fingerprint is distinct from old.request_fingerprint
     or new.created_by_user_id is distinct from old.created_by_user_id
     or new.submitted_at is distinct from old.submitted_at
     or new.accepted_at is distinct from old.accepted_at
     or new.preparing_at is distinct from old.preparing_at
     or new.ready_at is distinct from old.ready_at
     or new.served_at is distinct from old.served_at
     or new.delivered_at is distinct from old.delivered_at
     or new.completed_at is distinct from old.completed_at
     or new.rejected_at is distinct from old.rejected_at
     or new.cancelled_at is distinct from old.cancelled_at
     or new.created_at is distinct from old.created_at
     or new.updated_at is distinct from old.updated_at
     or new.version is distinct from old.version then
    raise exception 'ORDER_IMMUTABLE_FIELDS' using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger orders_immutable_fields
before update on public.orders
for each row execute function public.romano_guard_order_update();

create or replace function public.romano_reject_order_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'ORDERS_ARE_IMMUTABLE' using errcode = '55000';
end;
$$;

create trigger orders_reject_delete
before delete on public.orders
for each row execute function public.romano_reject_order_delete();

create or replace function public.romano_guard_order_status_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if current_setting('romano.order_transition', true) is distinct from 'allowed' then
      raise exception 'USE_ORDER_TRANSITION_RPC' using errcode = '55000';
    end if;
    new.version := old.version + 1;
    new.updated_at := now();
    case new.status
      when 'accepted' then new.accepted_at := coalesce(new.accepted_at, now());
      when 'preparing' then new.preparing_at := coalesce(new.preparing_at, now());
      when 'ready' then new.ready_at := coalesce(new.ready_at, now());
      when 'served' then new.served_at := coalesce(new.served_at, now());
      when 'delivered' then new.delivered_at := coalesce(new.delivered_at, now());
      when 'completed' then new.completed_at := coalesce(new.completed_at, now());
      when 'rejected' then new.rejected_at := coalesce(new.rejected_at, now());
      when 'cancelled' then new.cancelled_at := coalesce(new.cancelled_at, now());
      else null;
    end case;
  end if;
  return new;
end;
$$;

create trigger orders_status_guard
before update of status on public.orders
for each row execute function public.romano_guard_order_status_update();

create or replace function public.romano_transition_order(
  p_order uuid,
  p_expected_version bigint,
  p_to_status text,
  p_actor uuid,
  p_actor_type text,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_restaurant_role text;
  v_branch_role text;
  v_from_status text;
  v_transition_allowed boolean := false;
  v_authorized boolean := false;
begin
  if p_to_status not in ('accepted', 'preparing', 'ready', 'served', 'delivered', 'completed', 'rejected', 'cancelled')
     or p_actor_type not in ('staff', 'system')
     or jsonb_typeof(p_metadata) <> 'object'
     or char_length(coalesce(p_reason, '')) > 500 then
    raise exception 'INVALID_TRANSITION' using errcode = '22023';
  end if;

  select * into v_order
    from public.orders
   where id = p_order
   for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = '22023';
  end if;
  if v_order.version <> p_expected_version then
    raise exception 'ORDER_VERSION_CONFLICT' using errcode = '40001';
  end if;
  v_from_status := v_order.status;
  if p_to_status in ('rejected', 'cancelled') and nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'TRANSITION_REASON_REQUIRED' using errcode = '22023';
  end if;

  v_transition_allowed := case v_order.status
    when 'submitted' then p_to_status in ('accepted', 'rejected', 'cancelled')
    when 'accepted' then p_to_status in ('preparing', 'cancelled')
    when 'preparing' then p_to_status in ('ready', 'cancelled')
    when 'ready' then p_to_status in ('served', 'delivered', 'cancelled')
    when 'served' then p_to_status = 'completed'
    when 'delivered' then p_to_status = 'completed'
    else false
  end;
  if not v_transition_allowed then
    raise exception 'ILLEGAL_ORDER_TRANSITION' using errcode = '22023';
  end if;

  if p_actor_type = 'system' then
    select exists(
      select 1
        from public.branches b
       where b.id = v_order.branch_id
         and b.restaurant_id = v_order.restaurant_id
         and b.active
         and b.qr_ordering_enabled
         and b.auto_accept_qr_orders
    ) into v_authorized;
    v_authorized := v_authorized
      and v_order.status = 'submitted'
      and p_to_status = 'accepted'
      and v_order.channel = 'qr_dine_in'
      and p_actor is null;
  else
    if p_actor is null or not exists(
      select 1 from public.users u where u.id = p_actor and u.active
    ) then
      raise exception 'UNAUTHENTICATED' using errcode = '42501';
    end if;
    select rm.role into v_restaurant_role
      from public.restaurant_memberships rm
     where rm.restaurant_id = v_order.restaurant_id
       and rm.user_id = p_actor;
    select bm.role into v_branch_role
      from public.branch_staff_memberships bm
     where bm.restaurant_id = v_order.restaurant_id
       and bm.branch_id = v_order.branch_id
       and bm.user_id = p_actor
       and bm.active;

    v_authorized := v_restaurant_role in ('owner', 'manager')
      or v_branch_role = 'manager'
      or (v_branch_role = 'cashier' and p_to_status in ('accepted', 'rejected', 'cancelled', 'completed'))
      or (v_branch_role = 'kitchen' and p_to_status in ('preparing', 'ready'))
      or (v_branch_role = 'waiter' and p_to_status in ('served', 'delivered', 'completed'));
  end if;

  if not coalesce(v_authorized, false) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  perform set_config('romano.order_transition', 'allowed', true);
  update public.orders
     set status = p_to_status
   where id = v_order.id
   returning * into v_order;
  perform set_config('romano.order_transition', 'denied', true);

  insert into public.order_events(
    restaurant_id, branch_id, order_id, from_status, to_status,
    actor_type, actor_user_id, reason, metadata
  ) values (
    v_order.restaurant_id, v_order.branch_id, v_order.id,
    v_from_status, p_to_status,
    p_actor_type, p_actor, nullif(btrim(coalesce(p_reason, '')), ''), p_metadata
  );

  insert into public.integration_outbox(
    restaurant_id, branch_id, aggregate_type, aggregate_id,
    event_type, payload, idempotency_key
  ) values (
    v_order.restaurant_id, v_order.branch_id, 'order', v_order.id,
    'order.status_changed',
    jsonb_build_object(
      'orderId', v_order.id,
      'orderNumber', v_order.order_number,
      'status', v_order.status,
      'version', v_order.version
    ),
    'order:' || v_order.id::text || ':status:' || v_order.version::text
  );

  insert into public.audit_logs(
    restaurant_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    v_order.restaurant_id, p_actor, 'order.status.changed', 'order', v_order.id,
    jsonb_build_object(
      'branchId', v_order.branch_id,
      'toStatus', v_order.status,
      'version', v_order.version,
      'actorType', p_actor_type
    )
  );

  return jsonb_build_object(
    'id', v_order.id,
    'orderNumber', v_order.order_number,
    'status', v_order.status,
    'version', v_order.version,
    'updatedAt', v_order.updated_at
  );
end;
$$;

-- All operational data is fail-closed through PostgREST. Customer and staff
-- browser APIs are mediated by tenant-aware Edge Functions.
alter table public.branches enable row level security;
alter table public.branch_staff_memberships enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.table_sessions enable row level security;
alter table public.table_session_tokens enable row level security;
alter table public.branch_order_counters enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.integration_outbox enable row level security;

revoke all on table public.branches from public, anon, authenticated;
revoke all on table public.branch_staff_memberships from public, anon, authenticated;
revoke all on table public.restaurant_tables from public, anon, authenticated;
revoke all on table public.table_sessions from public, anon, authenticated;
revoke all on table public.table_session_tokens from public, anon, authenticated;
revoke all on table public.branch_order_counters from public, anon, authenticated;
revoke all on table public.orders from public, anon, authenticated;
revoke all on table public.order_items from public, anon, authenticated;
revoke all on table public.order_events from public, anon, authenticated;
revoke all on table public.integration_outbox from public, anon, authenticated;

grant select, insert, update, delete on table public.branches to service_role;
grant select, insert, update, delete on table public.branch_staff_memberships to service_role;
grant select, insert, update, delete on table public.restaurant_tables to service_role;
grant select, insert, update, delete on table public.table_sessions to service_role;
grant select, insert, update, delete on table public.table_session_tokens to service_role;
grant select, insert, update, delete on table public.branch_order_counters to service_role;
grant select, insert, update, delete on table public.orders to service_role;
grant select, insert, update, delete on table public.order_items to service_role;
grant select on table public.order_events to service_role;
grant insert on table public.order_events to service_role;
grant select, insert, update, delete on table public.integration_outbox to service_role;
grant usage, select on sequence public.order_events_id_seq to service_role;

revoke all on function public.romano_reject_order_event_mutation() from public, anon, authenticated;
revoke all on function public.romano_guard_order_item_mutation() from public, anon, authenticated;
revoke all on function public.romano_guard_order_update() from public, anon, authenticated;
revoke all on function public.romano_reject_order_delete() from public, anon, authenticated;
revoke all on function public.romano_guard_order_status_update() from public, anon, authenticated;
revoke all on function public.romano_transition_order(uuid, bigint, text, uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.romano_transition_order(uuid, bigint, text, uuid, text, text, jsonb)
  to service_role;

notify pgrst, 'reload schema';
