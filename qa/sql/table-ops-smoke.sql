begin;
do $table_test$
declare
  v_restaurant uuid:=gen_random_uuid();
  v_branch uuid:=gen_random_uuid();
  v_table uuid:=gen_random_uuid();
  v_session uuid:=gen_random_uuid();
  v_response jsonb;
begin
  insert into public.restaurants(id,slug,name) values (v_restaurant,'qa-table-ops','QA table ops');
  insert into public.branches(id,restaurant_id,slug,name,currency_code,currency_exponent,menu_price_to_minor_multiplier)
    values(v_branch,v_restaurant,'main','QA main','IRR',0,10);
  insert into public.restaurant_tables(id,restaurant_id,branch_id,code,display_name)
    values(v_table,v_restaurant,v_branch,'T-1','QA table 1');
  insert into public.table_sessions(id,restaurant_id,branch_id,table_id,status,opened_source,expires_at)
    values(v_session,v_restaurant,v_branch,v_table,'open','qr',now()+interval '2 hours');
  insert into public.table_session_tokens(restaurant_id,branch_id,table_session_id,token_hash,expires_at)
    values(v_restaurant,v_branch,v_session,repeat('a',64),now()+interval '2 hours');

  v_response:=public.romano_configure_table(v_restaurant,v_branch,v_table,null,true);
  if v_response->>'qrVersion'<>'2' or (v_response->>'revokedSessions')::int <> 1 then
    raise exception 'QR version rotation did not invalidate the session: %',v_response;
  end if;
  if not exists(select 1 from public.table_session_tokens where token_hash=repeat('a',64) and revoked_at is not null) then
    raise exception 'QR rotation failed to revoke token';
  end if;
  v_response:=public.romano_configure_table(v_restaurant,v_branch,v_table,false,false);
  if v_response->>'active'<>'false' or v_response->>'qrVersion'<>'2' then
    raise exception 'Disable table changed QR version unexpectedly: %',v_response;
  end if;
  v_response:=public.romano_configure_table(v_restaurant,v_branch,v_table,true,false);
  if v_response->>'active'<>'true' then
    raise exception 'Re-enabling table failed';
  end if;
  begin
    perform public.romano_configure_table(gen_random_uuid(),v_branch,v_table,false,false);
    raise exception 'Cross-tenant modification was permitted';
  exception when no_data_found then
    null;
  end;
  if has_function_privilege('anon','public.romano_configure_table(uuid,uuid,uuid,boolean,boolean)','EXECUTE') then
    raise exception 'Anonymous role must not configure tables';
  end if;
end;
$table_test$;
rollback;
select 'QR table lifecycle passed' as result;
