\set ON_ERROR_STOP on
begin;
do $$
declare
  v_hash text := repeat('a',64);
  v_result jsonb;
  v_i integer;
  v_user_id uuid := gen_random_uuid();
  v_session_id uuid := gen_random_uuid();
begin
  for v_i in 1..8 loop
    v_result := public.romano_consume_admin_login_attempt(v_hash);
    if (v_result->>'allowed')::boolean is not true then
      raise exception 'Login attempt % should be allowed: %',v_i,v_result;
    end if;
  end loop;

  v_result := public.romano_consume_admin_login_attempt(v_hash);
  if (v_result->>'allowed')::boolean is not false
     or coalesce((v_result->>'retryAfter')::integer,0) <= 0 then
    raise exception 'Ninth login attempt should be rate limited: %',v_result;
  end if;

  perform public.romano_clear_admin_login_rate_limit(v_hash);
  v_result := public.romano_consume_admin_login_attempt(v_hash);
  if (v_result->>'allowed')::boolean is not true then
    raise exception 'Successful-login reset did not clear the throttle: %',v_result;
  end if;

  begin
    perform public.romano_consume_admin_login_attempt('not-a-sha256-hash');
    raise exception 'Invalid hash key was accepted';
  exception when invalid_parameter_value then
    null;
  end;

  if has_table_privilege('anon','public.admin_login_rate_limits','select')
     or has_function_privilege('anon','public.romano_consume_admin_login_attempt(text)','execute')
     or has_function_privilege('authenticated','public.romano_clear_admin_login_rate_limit(text)','execute')
     or not has_function_privilege('service_role','public.romano_consume_admin_login_attempt(text)','execute') then
    raise exception 'Admin login throttle privileges are too broad or service role grant is missing';
  end if;

  insert into public.users(id,active) values(v_user_id,true);
  insert into auth.sessions(id,user_id,not_after)
  values(v_session_id,v_user_id,now()+interval '1 hour');
  if public.romano_is_auth_session_active(v_user_id,v_session_id) is not true then
    raise exception 'A live Supabase Auth session was not recognized';
  end if;
  if public.romano_is_auth_session_active(gen_random_uuid(),v_session_id) is not false then
    raise exception 'A session was accepted for the wrong user';
  end if;
  update auth.sessions set not_after=now()-interval '1 second' where id=v_session_id;
  if public.romano_is_auth_session_active(v_user_id,v_session_id) is not false then
    raise exception 'An expired Supabase Auth session was accepted';
  end if;
  delete from auth.sessions where id=v_session_id;
  if public.romano_is_auth_session_active(v_user_id,v_session_id) is not false then
    raise exception 'A deleted/revoked Supabase Auth session was accepted';
  end if;
  if has_function_privilege('anon','public.romano_is_auth_session_active(uuid,uuid)','execute')
     or has_function_privilege('authenticated','public.romano_is_auth_session_active(uuid,uuid)','execute')
     or not has_function_privilege('service_role','public.romano_is_auth_session_active(uuid,uuid)','execute') then
    raise exception 'Auth session validator privileges are too broad or service role grant is missing';
  end if;
end;
$$;
rollback;end;
$$;
rollback;
select 'ROMANO admin login rate-limit smoke passed' as result;
