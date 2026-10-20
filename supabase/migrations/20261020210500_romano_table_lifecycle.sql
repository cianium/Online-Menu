-- QR table lifecycle: tenant-scoped, atomic version rotation and session revocation.
-- This function is callable only from authenticated Edge Functions using service_role.
create or replace function public.romano_configure_table(
  p_restaurant uuid,
  p_branch uuid,
  p_table uuid,
  p_active boolean default null,
  p_rotate boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $table_config$
declare
  v_table public.restaurant_tables%rowtype;
  v_revoked integer := 0;
begin
  if p_restaurant is null or p_branch is null or p_table is null or
     (p_active is null and not p_rotate) or p_rotate is null then
    raise exception 'INVALID_TABLE_CONFIGURATION' using errcode = '22023';
  end if;
  select * into v_table from public.restaurant_tables
   where id=p_table and restaurant_id=p_restaurant and branch_id=p_branch
   for update;
  if not found then
    raise exception 'TABLE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if p_rotate and v_table.qr_version>=2147483647 then
    raise exception 'QR_VERSION_EXHAUSTED' using errcode='22003';
  end if;
  update public.restaurant_tables
     set active=coalesce(p_active,v_table.active),
         qr_version=case when p_rotate then qr_version + 1 else qr_version end,
         updated_at=now()
   where id=p_table and restaurant_id=p_restaurant and branch_id=p_branch
   returning * into v_table;
  if p_rotate or v_table.active=false then
    update public.table_session_tokens token
       set revoked_at=now()
     where token.revoked_at is null
       and token.restaurant_id=p_restaurant
       and token.branch_id=p_branch
       and token.table_session_id in (
         select session.id from public.table_sessions session
          where session.restaurant_id=p_restaurant
            and session.branch_id=p_branch
            and session.table_id=p_table
       );
    get diagnostics v_revoked = row_count;
  end if;
  return jsonb_build_object(
    'id',v_table.id,
    'active',v_table.active,
    'qrVersion',v_table.qr_version,
    'revokedSessions',v_revoked
  );
end;
$table_config$;

revoke all on function public.romano_configure_table(uuid,uuid,uuid,boolean,boolean)
  from public,anon,authenticated;
grant execute on function public.romano_configure_table(uuid,uuid,uuid,boolean,boolean)
  to service_role;
notify pgrst,'reload schema';
