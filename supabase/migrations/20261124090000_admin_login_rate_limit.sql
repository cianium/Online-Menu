-- Persistent server-side throttling for restaurant admin password login.
-- Email identifiers are SHA-256 digests; raw email addresses are never stored.
create table public.admin_login_rate_limits (
  email_hash text primary key check (email_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  attempts smallint not null check (attempts between 1 and 8),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create index admin_login_rate_limits_updated_at_idx
  on public.admin_login_rate_limits(updated_at);

alter table public.admin_login_rate_limits enable row level security;
revoke all on table public.admin_login_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.admin_login_rate_limits to service_role;

create or replace function public.romano_consume_admin_login_attempt(p_email_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.admin_login_rate_limits%rowtype;
  v_now timestamptz := clock_timestamp();
  v_window interval := interval '15 minutes';
  v_limit smallint := 8;
  v_retry integer;
begin
  if p_email_hash is null or p_email_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_LOGIN_RATE_LIMIT_KEY' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_email_hash, 0));

  -- Opportunistic bounded cleanup avoids an ever-growing table without a cron dependency.
  if mod(hashtextextended(p_email_hash, 0) % 100 + 100, 100) = 0 then
    delete from public.admin_login_rate_limits
     where updated_at < v_now - interval '1 day';
  end if;

  select * into v_row
    from public.admin_login_rate_limits
   where email_hash = p_email_hash
   for update;

  if not found then
    insert into public.admin_login_rate_limits(email_hash, window_started_at, attempts)
    values (p_email_hash, v_now, 1)
    returning * into v_row;
  elsif v_row.window_started_at <= v_now - v_window then
    update public.admin_login_rate_limits
       set window_started_at = v_now, attempts = 1, blocked_until = null, updated_at = v_now
     where email_hash = p_email_hash
     returning * into v_row;
  elsif v_row.blocked_until is not null and v_row.blocked_until > v_now then
    v_retry := greatest(1, ceil(extract(epoch from (v_row.blocked_until - v_now)))::integer);
    return jsonb_build_object('allowed', false, 'retryAfter', v_retry);
  elsif v_row.attempts >= v_limit then
    update public.admin_login_rate_limits
       set blocked_until = window_started_at + v_window, updated_at = v_now
     where email_hash = p_email_hash
     returning * into v_row;
  else
    update public.admin_login_rate_limits
       set attempts = attempts + 1, updated_at = v_now
     where email_hash = p_email_hash
     returning * into v_row;
  end if;

  if v_row.blocked_until is not null and v_row.blocked_until > v_now then
    v_retry := greatest(1, ceil(extract(epoch from (v_row.blocked_until - v_now)))::integer);
    return jsonb_build_object('allowed', false, 'retryAfter', v_retry);
  end if;

  return jsonb_build_object('allowed', true, 'retryAfter', 0);
end;
$$;

create or replace function public.romano_clear_admin_login_rate_limit(p_email_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_email_hash is null or p_email_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_LOGIN_RATE_LIMIT_KEY' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_email_hash, 0));
  delete from public.admin_login_rate_limits where email_hash = p_email_hash;
end;
$$;

revoke all on function public.romano_consume_admin_login_attempt(text) from public, anon, authenticated;
revoke all on function public.romano_clear_admin_login_rate_limit(text) from public, anon, authenticated;
grant execute on function public.romano_consume_admin_login_attempt(text) to service_role;
grant execute on function public.romano_clear_admin_login_rate_limit(text) to service_role;

comment on table public.admin_login_rate_limits is
  'Hashed email keys for durable admin password-login throttling; raw identifiers are never stored.';
notify pgrst, 'reload schema';

-- Validate the JWT session_id against Supabase Auth's authoritative session table.
-- This closes the remaining access-token window after local logout or user deletion
-- for requests mediated by the admin Edge Function.
create or replace function public.romano_is_auth_session_active(
  p_user_id uuid,
  p_session_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from auth.sessions s
     where s.id = p_session_id
       and s.user_id = p_user_id
       and (s.not_after is null or s.not_after > now())
  );
$$;

revoke all on function public.romano_is_auth_session_active(uuid, uuid) from public, anon, authenticated;
grant execute on function public.romano_is_auth_session_active(uuid, uuid) to service_role;
