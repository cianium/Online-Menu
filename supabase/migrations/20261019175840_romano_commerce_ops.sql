-- Online-Menu-vq.3 commerce and operations layer.
-- Customer payments settle directly into each restaurant's own gateway account.
-- Browser roles have no direct access; Edge Functions mediate every operation.

alter table public.orders
  add column payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  add column payment_method text
    check (payment_method is null or payment_method in ('online', 'cash', 'card_terminal'));

create table public.branch_payment_gateways (
  restaurant_id uuid not null,
  branch_id uuid primary key,
  provider text not null default 'zarinpal' check (provider in ('zarinpal')),
  merchant_id text not null check (
    merchant_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  sandbox boolean not null default true,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (restaurant_id, branch_id)
    references public.branches(restaurant_id, id) on delete cascade
);

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  branch_id uuid not null,
  order_id uuid not null,
  provider text not null check (provider in ('zarinpal')),
  amount_minor bigint not null check (amount_minor >= 1000),
  currency_code text not null check (currency_code = 'IRR'),
  status text not null default 'initiated' check (
    status in ('initiated', 'requested', 'verified', 'failed', 'cancelled')
  ),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 160),
  provider_authority text unique check (
    provider_authority is null or provider_authority ~ '^[A-Za-z0-9_-]{16,128}$'
  ),
  provider_reference text,
  provider_code integer,
  masked_card_pan text check (masked_card_pan is null or char_length(masked_card_pan) <= 32),
  fee_minor bigint check (fee_minor is null or fee_minor >= 0),
  failure_code text check (failure_code is null or char_length(failure_code) <= 80),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, order_id, idempotency_key),
  foreign key (restaurant_id, branch_id, order_id)
    references public.orders(restaurant_id, branch_id, id) on delete restrict
);

create index payment_attempts_order_idx
  on public.payment_attempts(restaurant_id, branch_id, order_id, created_at desc);
create index payment_attempts_pending_idx
  on public.payment_attempts(created_at)
  where status in ('initiated', 'requested');

create trigger branch_payment_gateways_updated_at
before update on public.branch_payment_gateways
for each row execute function public.set_updated_at();

create trigger payment_attempts_updated_at
before update on public.payment_attempts
for each row execute function public.set_updated_at();

create or replace function public.romano_guard_order_payment_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.payment_status is distinct from old.payment_status
      or new.payment_method is distinct from old.payment_method)
     and current_setting('romano.payment_update', true) is distinct from 'allowed' then
    raise exception 'USE_PAYMENT_RPC' using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger orders_payment_guard
before update of payment_status, payment_method on public.orders
for each row execute function public.romano_guard_order_payment_update();

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
    'paymentStatus', o.payment_status,
    'paymentMethod', o.payment_method,
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

create or replace function public.romano_prepare_payment(
  p_session_token_hash text,
  p_order uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_gateway public.branch_payment_gateways%rowtype;
  v_attempt public.payment_attempts%rowtype;
begin
  if p_session_token_hash !~ '^[a-f0-9]{64}$'
     or p_order is null
     or char_length(coalesce(p_idempotency_key, '')) not between 16 and 160
     or p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]+$' then
    raise exception 'INVALID_PAYMENT_REQUEST' using errcode = '22023';
  end if;

  select o.* into v_order
  from public.table_session_tokens st
  join public.table_sessions s
    on s.restaurant_id = st.restaurant_id
   and s.branch_id = st.branch_id
   and s.id = st.table_session_id
  join public.orders o
    on o.restaurant_id = s.restaurant_id
   and o.branch_id = s.branch_id
   and o.table_session_id = s.id
  where st.token_hash = p_session_token_hash
    and st.revoked_at is null
    and st.expires_at > now()
    and o.id = p_order
  for update of o;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = '22023';
  end if;
  if v_order.payment_status = 'paid' then
    raise exception 'ORDER_ALREADY_PAID' using errcode = '22023';
  end if;
  if v_order.status in ('rejected', 'cancelled') then
    raise exception 'ORDER_NOT_PAYABLE' using errcode = '22023';
  end if;
  if v_order.currency_code <> 'IRR' or v_order.total_minor < 1000 then
    raise exception 'PAYMENT_CURRENCY_NOT_SUPPORTED' using errcode = '22023';
  end if;

  select * into v_gateway
  from public.branch_payment_gateways g
  where g.restaurant_id = v_order.restaurant_id
    and g.branch_id = v_order.branch_id
    and g.active;
  if not found then
    raise exception 'PAYMENT_GATEWAY_NOT_CONFIGURED' using errcode = '55000';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_order.restaurant_id::text || ':' || p_idempotency_key, 0)
  );
  select * into v_attempt
  from public.payment_attempts pa
  where pa.restaurant_id = v_order.restaurant_id
    and pa.order_id = v_order.id
    and pa.idempotency_key = p_idempotency_key;

  if not found then
    insert into public.payment_attempts(
      restaurant_id, branch_id, order_id, provider, amount_minor,
      currency_code, idempotency_key
    ) values (
      v_order.restaurant_id, v_order.branch_id, v_order.id, v_gateway.provider,
      v_order.total_minor, v_order.currency_code, p_idempotency_key
    ) returning * into v_attempt;
  elsif v_attempt.amount_minor <> v_order.total_minor
        or v_attempt.provider <> v_gateway.provider then
    raise exception 'PAYMENT_IDEMPOTENCY_CONFLICT' using errcode = '22023';
  end if;

  perform set_config('romano.payment_update', 'allowed', true);
  update public.orders
     set payment_status = case when payment_status <> 'paid' then 'pending' else payment_status end,
         payment_method = 'online'
   where id = v_order.id;
  perform set_config('romano.payment_update', 'denied', true);

  return jsonb_build_object(
    'attemptId', v_attempt.id,
    'orderId', v_order.id,
    'orderNumber', v_order.order_number,
    'amountMinor', v_attempt.amount_minor,
    'currencyCode', v_attempt.currency_code,
    'provider', v_gateway.provider,
    'merchantId', v_gateway.merchant_id,
    'sandbox', v_gateway.sandbox,
    'status', v_attempt.status,
    'authority', v_attempt.provider_authority
  );
end;
$$;

create or replace function public.romano_attach_payment_authority(
  p_attempt uuid,
  p_authority text,
  p_provider_code integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.payment_attempts%rowtype;
begin
  if p_attempt is null or p_authority !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'INVALID_PAYMENT_AUTHORITY' using errcode = '22023';
  end if;
  update public.payment_attempts
     set provider_authority = coalesce(provider_authority, p_authority),
         provider_code = p_provider_code,
         status = case when status = 'initiated' then 'requested' else status end
   where id = p_attempt
     and status in ('initiated', 'requested')
     and (provider_authority is null or provider_authority = p_authority)
   returning * into v_attempt;
  if not found then
    raise exception 'PAYMENT_ATTEMPT_NOT_FOUND' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'attemptId', v_attempt.id,
    'orderId', v_attempt.order_id,
    'authority', v_attempt.provider_authority,
    'status', v_attempt.status
  );
end;
$$;

create or replace function public.romano_payment_callback_context(p_authority text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'attemptId', pa.id,
    'orderId', pa.order_id,
    'orderNumber', o.order_number,
    'amountMinor', pa.amount_minor,
    'currencyCode', pa.currency_code,
    'provider', pa.provider,
    'merchantId', g.merchant_id,
    'sandbox', g.sandbox,
    'status', pa.status
  )
  from public.payment_attempts pa
  join public.orders o
    on o.restaurant_id = pa.restaurant_id
   and o.branch_id = pa.branch_id
   and o.id = pa.order_id
  join public.branch_payment_gateways g
    on g.restaurant_id = pa.restaurant_id
   and g.branch_id = pa.branch_id
  where pa.provider_authority = p_authority;
$$;

create or replace function public.romano_finalize_payment(
  p_authority text,
  p_success boolean,
  p_provider_code integer,
  p_reference text default null,
  p_masked_card_pan text default null,
  p_fee_minor bigint default null,
  p_failure_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.payment_attempts%rowtype;
begin
  select * into v_attempt
  from public.payment_attempts
  where provider_authority = p_authority
  for update;
  if not found then
    raise exception 'PAYMENT_ATTEMPT_NOT_FOUND' using errcode = '22023';
  end if;

  if v_attempt.status = 'verified' then
    return jsonb_build_object(
      'attemptId', v_attempt.id,
      'orderId', v_attempt.order_id,
      'status', v_attempt.status,
      'reference', v_attempt.provider_reference,
      'idempotentReplay', true
    );
  end if;

  update public.payment_attempts
     set status = case when p_success then 'verified' else 'failed' end,
         provider_code = p_provider_code,
         provider_reference = nullif(btrim(coalesce(p_reference, '')), ''),
         masked_card_pan = nullif(btrim(coalesce(p_masked_card_pan, '')), ''),
         fee_minor = p_fee_minor,
         failure_code = nullif(btrim(coalesce(p_failure_code, '')), ''),
         verified_at = case when p_success then now() else null end
   where id = v_attempt.id
   returning * into v_attempt;

  perform set_config('romano.payment_update', 'allowed', true);
  update public.orders
     set payment_status = case when p_success then 'paid' else 'failed' end,
         payment_method = 'online'
   where id = v_attempt.order_id;
  perform set_config('romano.payment_update', 'denied', true);

  insert into public.integration_outbox(
    restaurant_id, branch_id, aggregate_type, aggregate_id,
    event_type, payload, idempotency_key
  ) values (
    v_attempt.restaurant_id, v_attempt.branch_id, 'order', v_attempt.order_id,
    case when p_success then 'payment.verified' else 'payment.failed' end,
    jsonb_build_object(
      'orderId', v_attempt.order_id,
      'attemptId', v_attempt.id,
      'provider', v_attempt.provider,
      'amountMinor', v_attempt.amount_minor,
      'reference', v_attempt.provider_reference
    ),
    'payment:' || v_attempt.id::text || ':final:' || case when p_success then 'verified' else 'failed' end
  ) on conflict (idempotency_key) do nothing;

  return jsonb_build_object(
    'attemptId', v_attempt.id,
    'orderId', v_attempt.order_id,
    'status', v_attempt.status,
    'reference', v_attempt.provider_reference,
    'idempotentReplay', false
  );
end;
$$;

alter table public.branch_payment_gateways enable row level security;
alter table public.payment_attempts enable row level security;

revoke all on table public.branch_payment_gateways from public, anon, authenticated;
revoke all on table public.payment_attempts from public, anon, authenticated;
grant select, insert, update, delete on table public.branch_payment_gateways to service_role;
grant select, insert, update, delete on table public.payment_attempts to service_role;

revoke all on function public.romano_guard_order_payment_update() from public, anon, authenticated;
revoke all on function public.romano_order_payload(uuid) from public, anon, authenticated, service_role;
revoke all on function public.romano_prepare_payment(text, uuid, text) from public, anon, authenticated;
revoke all on function public.romano_attach_payment_authority(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.romano_payment_callback_context(text) from public, anon, authenticated;
revoke all on function public.romano_finalize_payment(text, boolean, integer, text, text, bigint, text)
  from public, anon, authenticated;

grant execute on function public.romano_prepare_payment(text, uuid, text) to service_role;
grant execute on function public.romano_attach_payment_authority(uuid, text, integer) to service_role;
grant execute on function public.romano_payment_callback_context(text) to service_role;
grant execute on function public.romano_finalize_payment(text, boolean, integer, text, text, bigint, text)
  to service_role;

notify pgrst, 'reload schema';
