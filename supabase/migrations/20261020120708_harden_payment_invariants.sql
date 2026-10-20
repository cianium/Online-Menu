-- Harden the payment state machine against retries, concurrent callbacks and
-- ambiguous provider requests. A paid/refunded order is monotonic and one
-- order can have at most one non-terminal payment attempt.

alter table public.payment_attempts
  drop constraint payment_attempts_status_check;

alter table public.payment_attempts
  add constraint payment_attempts_status_check check (
    status in (
      'initiated', 'requested', 'requires_review',
      'verified', 'duplicate_verified', 'failed', 'cancelled'
    )
  );

-- Do not silently guess which pre-existing attempt is authoritative. If this
-- guard fails, reconcile those orders with the PSP before applying the index.
do $$
begin
  if exists (
    select 1
    from public.payment_attempts
    where status in ('initiated', 'requested', 'requires_review')
    group by order_id
    having count(*) > 1
  ) then
    raise exception 'PAYMENT_ACTIVE_ATTEMPTS_REQUIRE_RECONCILIATION'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.payment_attempts
    where status = 'verified'
    group by order_id
    having count(*) > 1
  ) then
    raise exception 'PAYMENT_VERIFIED_ATTEMPTS_REQUIRE_RECONCILIATION'
      using errcode = '55000';
  end if;
end;
$$;

create unique index payment_attempts_one_active_per_order_idx
  on public.payment_attempts(order_id)
  where status in ('initiated', 'requested', 'requires_review');

create unique index payment_attempts_one_verified_per_order_idx
  on public.payment_attempts(order_id)
  where status = 'verified';

create or replace function public.romano_guard_order_payment_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.payment_status = 'paid'
     and new.payment_status not in ('paid', 'refunded') then
    raise exception 'PAYMENT_STATUS_REGRESSION' using errcode = '55000';
  end if;

  if old.payment_status = 'refunded'
     and new.payment_status <> 'refunded' then
    raise exception 'PAYMENT_STATUS_REGRESSION' using errcode = '55000';
  end if;

  if (new.payment_status is distinct from old.payment_status
      or new.payment_method is distinct from old.payment_method)
     and current_setting('romano.payment_update', true) is distinct from 'allowed' then
    raise exception 'USE_PAYMENT_RPC' using errcode = '55000';
  end if;
  return new;
end;
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
  v_created boolean := false;
begin
  if p_session_token_hash !~ '^[a-f0-9]{64}$'
     or p_order is null
     or char_length(coalesce(p_idempotency_key, '')) not between 16 and 160
     or p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]+$' then
    raise exception 'INVALID_PAYMENT_REQUEST' using errcode = '22023';
  end if;

  -- Lock ordering is always order -> attempt. The callback uses the same
  -- order, avoiding deadlocks with a simultaneous start request.
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
  if v_order.payment_status = 'refunded'
     or v_order.status in ('rejected', 'cancelled') then
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

  -- First replay the exact logical request, including its terminal result.
  select * into v_attempt
  from public.payment_attempts pa
  where pa.restaurant_id = v_order.restaurant_id
    and pa.order_id = v_order.id
    and pa.idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_attempt.amount_minor <> v_order.total_minor
       or v_attempt.provider <> v_gateway.provider then
      raise exception 'PAYMENT_IDEMPOTENCY_CONFLICT' using errcode = '22023';
    end if;
  else
    -- A different browser tab/key must join the existing active attempt.
    select * into v_attempt
    from public.payment_attempts pa
    where pa.order_id = v_order.id
      and pa.status in ('initiated', 'requested', 'requires_review')
    for update;

    if found then
      if v_attempt.amount_minor <> v_order.total_minor
         or v_attempt.provider <> v_gateway.provider then
        raise exception 'PAYMENT_IDEMPOTENCY_CONFLICT' using errcode = '22023';
      end if;
    else
      insert into public.payment_attempts(
        restaurant_id, branch_id, order_id, provider, amount_minor,
        currency_code, idempotency_key
      ) values (
        v_order.restaurant_id, v_order.branch_id, v_order.id, v_gateway.provider,
        v_order.total_minor, v_order.currency_code, p_idempotency_key
      ) returning * into v_attempt;
      v_created := true;
    end if;
  end if;

  if v_attempt.status in ('verified', 'duplicate_verified', 'failed', 'cancelled') then
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
      'authority', v_attempt.provider_authority,
      'created', false
    );
  end if;

  perform set_config('romano.payment_update', 'allowed', true);
  update public.orders
     set payment_status = case
           when payment_status in ('unpaid', 'failed') then 'pending'
           else payment_status
         end,
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
    'authority', v_attempt.provider_authority,
    'created', v_created
  );
end;
$$;

create or replace function public.romano_fail_payment_start(
  p_attempt uuid,
  p_provider_code integer,
  p_failure_code text,
  p_requires_review boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_order_id uuid;
  v_status text;
begin
  if p_attempt is null
     or char_length(coalesce(p_failure_code, '')) not between 1 and 80 then
    raise exception 'INVALID_PAYMENT_RESULT' using errcode = '22023';
  end if;

  select order_id into v_order_id
  from public.payment_attempts
  where id = p_attempt;
  if not found then
    raise exception 'PAYMENT_ATTEMPT_NOT_FOUND' using errcode = '22023';
  end if;

  select * into v_order
  from public.orders
  where id = v_order_id
  for update;

  select * into v_attempt
  from public.payment_attempts
  where id = p_attempt
  for update;

  if v_attempt.status <> 'initiated' then
    return jsonb_build_object(
      'attemptId', v_attempt.id,
      'orderId', v_attempt.order_id,
      'status', v_attempt.status,
      'idempotentReplay', true
    );
  end if;

  v_status := case when p_requires_review then 'requires_review' else 'failed' end;
  update public.payment_attempts
     set status = v_status,
         provider_code = p_provider_code,
         failure_code = btrim(p_failure_code)
   where id = v_attempt.id
   returning * into v_attempt;

  if v_order.payment_status not in ('paid', 'refunded') then
    perform set_config('romano.payment_update', 'allowed', true);
    update public.orders
       set payment_status = case when p_requires_review then 'pending' else 'failed' end,
           payment_method = 'online'
     where id = v_order.id;
    perform set_config('romano.payment_update', 'denied', true);
  end if;

  insert into public.integration_outbox(
    restaurant_id, branch_id, aggregate_type, aggregate_id,
    event_type, payload, idempotency_key
  ) values (
    v_attempt.restaurant_id, v_attempt.branch_id, 'order', v_attempt.order_id,
    case when p_requires_review then 'payment.request_ambiguous' else 'payment.request_failed' end,
    jsonb_build_object(
      'orderId', v_attempt.order_id,
      'attemptId', v_attempt.id,
      'provider', v_attempt.provider,
      'providerCode', p_provider_code,
      'failureCode', v_attempt.failure_code,
      'requiresReview', p_requires_review
    ),
    'payment:' || v_attempt.id::text || ':start:' || v_status
  ) on conflict (idempotency_key) do nothing;

  return jsonb_build_object(
    'attemptId', v_attempt.id,
    'orderId', v_attempt.order_id,
    'status', v_attempt.status,
    'idempotentReplay', false
  );
end;
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
  v_order public.orders%rowtype;
  v_order_id uuid;
  v_status text;
  v_event text;
  v_replay boolean := false;
begin
  if p_authority !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'INVALID_PAYMENT_AUTHORITY' using errcode = '22023';
  end if;

  -- Resolve the order first, then lock order -> attempt in the same order as
  -- romano_prepare_payment.
  select order_id into v_order_id
  from public.payment_attempts
  where provider_authority = p_authority;
  if not found then
    raise exception 'PAYMENT_ATTEMPT_NOT_FOUND' using errcode = '22023';
  end if;

  select * into v_order
  from public.orders
  where id = v_order_id
  for update;

  select * into v_attempt
  from public.payment_attempts
  where provider_authority = p_authority
  for update;

  if v_attempt.status in ('verified', 'duplicate_verified') then
    v_replay := true;
  elsif not p_success and v_attempt.status in ('failed', 'cancelled') then
    v_replay := true;
  else
    if p_success and v_order.payment_status in ('paid', 'refunded') then
      v_status := 'duplicate_verified';
      v_event := 'payment.duplicate_verified';
    elsif p_success then
      v_status := 'verified';
      v_event := 'payment.verified';
    elsif p_failure_code = 'CUSTOMER_CANCELLED' then
      v_status := 'cancelled';
      v_event := 'payment.cancelled';
    else
      v_status := 'failed';
      v_event := 'payment.failed';
    end if;

    update public.payment_attempts
       set status = v_status,
           provider_code = p_provider_code,
           provider_reference = nullif(btrim(coalesce(p_reference, '')), ''),
           masked_card_pan = nullif(btrim(coalesce(p_masked_card_pan, '')), ''),
           fee_minor = p_fee_minor,
           failure_code = nullif(btrim(coalesce(p_failure_code, '')), ''),
           verified_at = case when p_success then now() else null end
     where id = v_attempt.id
     returning * into v_attempt;

    if v_order.payment_status not in ('paid', 'refunded') then
      perform set_config('romano.payment_update', 'allowed', true);
      update public.orders
         set payment_status = case when p_success then 'paid' else 'failed' end,
             payment_method = 'online'
       where id = v_attempt.order_id
       returning * into v_order;
      perform set_config('romano.payment_update', 'denied', true);
    end if;

    insert into public.integration_outbox(
      restaurant_id, branch_id, aggregate_type, aggregate_id,
      event_type, payload, idempotency_key
    ) values (
      v_attempt.restaurant_id, v_attempt.branch_id, 'order', v_attempt.order_id,
      v_event,
      jsonb_build_object(
        'orderId', v_attempt.order_id,
        'attemptId', v_attempt.id,
        'provider', v_attempt.provider,
        'amountMinor', v_attempt.amount_minor,
        'reference', v_attempt.provider_reference,
        'requiresRefund', v_status = 'duplicate_verified'
      ),
      'payment:' || v_attempt.id::text || ':final:' || v_status
    ) on conflict (idempotency_key) do nothing;
  end if;

  return jsonb_build_object(
    'attemptId', v_attempt.id,
    'orderId', v_attempt.order_id,
    'status', v_attempt.status,
    'reference', v_attempt.provider_reference,
    'orderPaymentStatus', v_order.payment_status,
    'successful', v_attempt.status in ('verified', 'duplicate_verified')
                  or v_order.payment_status in ('paid', 'refunded'),
    'requiresRefund', v_attempt.status = 'duplicate_verified',
    'idempotentReplay', v_replay
  );
end;
$$;

revoke all on function public.romano_fail_payment_start(uuid, integer, text, boolean)
  from public, anon, authenticated;
grant execute on function public.romano_fail_payment_start(uuid, integer, text, boolean)
  to service_role;

notify pgrst, 'reload schema';
