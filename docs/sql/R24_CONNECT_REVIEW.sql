-- R24.8 review candidate, NOT an applied or generated migration.
-- Apply only to a disposable database after generating a proper migration.
begin;
create table public.romano_connect_conversations (
 id uuid primary key default gen_random_uuid(),
 guest_token_id uuid not null unique references public.table_session_tokens(id) on delete cascade,
 status text not null default 'new' check(status in ('new','in_progress','resolved','closed')),
 assignee_id uuid references public.users(id) on delete set null,
 language text not null check(language in ('fa','en','tr','ar')),
 version integer not null default 1 check(version between 1 and 2147483647),
 message_count integer not null default 0 check(message_count between 0 and 200),
 guest_message_count integer not null default 0 check(guest_message_count between 0 and message_count),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null,
 check(updated_at>=created_at and expires_at>created_at)
);
create table public.romano_connect_messages (
 conversation_id uuid not null references public.romano_connect_conversations(id) on delete cascade,
 sequence integer not null check(sequence between 1 and 200),
 client_id uuid not null,
 sender_kind text not null check(sender_kind in ('guest','staff')),
 sender_user_id uuid,
 language text not null check(language in ('fa','en','tr','ar')),
 body text not null check(char_length(btrim(body)) between 1 and 2000 and char_length(body)<=2000),
 created_at timestamptz not null,
 primary key(conversation_id,sequence),
 unique(conversation_id,client_id),
 check((sender_kind='guest')=(sender_user_id is null))
);
create index romano_connect_updated_idx on public.romano_connect_conversations(updated_at desc,id);
alter table public.romano_connect_conversations enable row level security;
alter table public.romano_connect_messages enable row level security;
revoke all on public.romano_connect_conversations,public.romano_connect_messages from public,anon,authenticated;
grant select,insert,update,delete on public.romano_connect_conversations,public.romano_connect_messages to service_role;

-- Server-only projection. Never return token identifiers, token hashes or staff user IDs.
create function public.romano_connect_message_json(m public.romano_connect_messages,p_staff boolean)
returns jsonb language sql immutable security invoker set search_path='' as $$
 select jsonb_build_object('sequence',m.sequence,'clientId',m.client_id,'senderKind',m.sender_kind,
 'language',m.language,'text',m.body,'createdAt',floor(extract(epoch from m.created_at)*1000)::bigint,
 'own',case when p_staff then m.sender_kind='staff' else m.sender_kind='guest' end)
$$;
create function public.romano_connect_metadata(p_id uuid,p_staff boolean)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',c.id,'tableId',t.code,'language',c.language,'status',
 case when tok.revoked_at is not null or s.status<>'open' or not t.active or not b.active or not b.qr_ordering_enabled or not r.published
 then 'closed' else c.status end,'version',c.version,
 'assigneeId',case when p_staff and c.assignee_id is not null then 'assigned' else null end,
 'createdAt',floor(extract(epoch from c.created_at)*1000)::bigint,
 'updatedAt',floor(extract(epoch from c.updated_at)*1000)::bigint,
 'expiresAt',floor(extract(epoch from least(c.expires_at,tok.expires_at,s.expires_at))*1000)::bigint,
 'orderId',null,'guestMessageCount',c.guest_message_count,
 'firstResponseMs',case when p_staff then (select greatest(0,floor(extract(epoch from (staff.created_at-guest.created_at))*1000)::bigint)
 from public.romano_connect_messages guest join public.romano_connect_messages staff on staff.conversation_id=guest.conversation_id and staff.sequence>guest.sequence and staff.sender_kind='staff'
 where guest.conversation_id=c.id and guest.sender_kind='guest' order by guest.sequence,staff.sequence limit 1) else null end)
 from public.romano_connect_conversations c
 join public.table_session_tokens tok on tok.id=c.guest_token_id
 join public.table_sessions s on s.id=tok.table_session_id and s.restaurant_id=tok.restaurant_id and s.branch_id=tok.branch_id
 join public.restaurant_tables t on t.id=s.table_id and t.restaurant_id=s.restaurant_id and t.branch_id=s.branch_id
 join public.branches b on b.id=t.branch_id and b.restaurant_id=t.restaurant_id
 join public.restaurants r on r.id=t.restaurant_id
 where c.id=p_id
$$;
create function public.romano_connect_snapshot(p_id uuid,p_staff boolean)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('conversation',public.romano_connect_metadata(p_id,p_staff),'messages',
 coalesce((select jsonb_agg(public.romano_connect_message_json(m,p_staff) order by m.sequence)
 from public.romano_connect_messages m where m.conversation_id=p_id),'[]'::jsonb))
$$;
-- All callers must hold a row lock on the conversation before appending.
create function public.romano_connect_append(p_id uuid,p_actor uuid,p_client_id uuid,p_language text,p_text text,p_expected integer)
returns void language plpgsql security invoker set search_path='' as $$
declare
 c public.romano_connect_conversations%rowtype;
 prior public.romano_connect_messages%rowtype;
 v_now timestamptz:=clock_timestamp();
 v_kind text:=case when p_actor is null then 'guest' else 'staff' end;
 v_body text:=btrim(p_text,E' \t\n\r');
begin
 if p_client_id is null or p_language is null or p_language not in ('fa','en','tr','ar') or v_body is null
 or char_length(v_body) not between 1 and 2000
 or translate(v_body,E'\t\n\r','') ~ '[[:cntrl:]]' then raise exception 'CONNECT_INVALID_MESSAGE' using errcode='22023'; end if;
 select * into c from public.romano_connect_conversations where id=p_id for update;
 v_now:=clock_timestamp();
 if not found then raise exception 'CONNECT_NOT_FOUND' using errcode='42501'; end if;
 if c.expires_at<=v_now then raise exception 'CONNECT_EXPIRED' using errcode='55000'; end if;
 select * into prior from public.romano_connect_messages where conversation_id=p_id and client_id=p_client_id;
 if found then
  if prior.sender_kind<>v_kind or prior.sender_user_id is distinct from p_actor or prior.body<>v_body or prior.language<>p_language then
   raise exception 'CONNECT_IDEMPOTENCY_CONFLICT' using errcode='40001';
  end if;
  return;
 end if;
 if c.status not in ('new','in_progress') then raise exception 'CONNECT_INACTIVE' using errcode='55000'; end if;
 if p_actor is not null and p_expected is distinct from c.version then raise exception 'CONNECT_STALE' using errcode='40001'; end if;
 if c.message_count>=200 then raise exception 'CONNECT_MESSAGE_LIMIT' using errcode='55000'; end if;
 if (select count(*) from public.romano_connect_messages m where m.conversation_id=p_id and m.sender_kind=v_kind and m.created_at>v_now-interval '10 seconds')>=10
 then raise exception 'CONNECT_RATE_LIMIT' using errcode='55000'; end if;
 v_now:=greatest(v_now,c.updated_at);
 insert into public.romano_connect_messages(conversation_id,sequence,client_id,sender_kind,sender_user_id,language,body,created_at)
 values(p_id,c.message_count+1,p_client_id,v_kind,p_actor,p_language,v_body,v_now);
 update public.romano_connect_conversations set version=version+1,message_count=message_count+1,
 guest_message_count=guest_message_count+case when p_actor is null then 1 else 0 end,
 updated_at=v_now,status=case when p_actor is not null and status='new' then 'in_progress' else status end
 where id=p_id;
end $$;

create function public.romano_connect_guest(p_token_hash text,p_op text,p_client_id uuid default null,p_language text default null,p_text text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 tok public.table_session_tokens%rowtype;
 c public.romano_connect_conversations%rowtype;
 v_exp timestamptz;
 v_now timestamptz:=clock_timestamp();
begin
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' or p_op is null or p_op not in ('get','send') then raise exception 'CONNECT_INVALID_REQUEST' using errcode='22023'; end if;
 -- Token is unique per QR issuance, unlike the table session. Lock it to serialize first send and revocation.
 select * into tok from public.table_session_tokens where token_hash=p_token_hash for update;
 v_now:=clock_timestamp();
 if not found or tok.revoked_at is not null or tok.expires_at<=v_now then raise exception 'CONNECT_EXPIRED' using errcode='42501'; end if;
 select least(tok.expires_at,s.expires_at) into v_exp from public.table_sessions s
 join public.restaurant_tables t on t.id=s.table_id and t.restaurant_id=s.restaurant_id and t.branch_id=s.branch_id
 join public.branches b on b.id=s.branch_id and b.restaurant_id=s.restaurant_id
 join public.restaurants r on r.id=s.restaurant_id
 where s.id=tok.table_session_id and s.restaurant_id=tok.restaurant_id and s.branch_id=tok.branch_id
 and s.status='open' and s.expires_at>v_now and t.active and b.active and b.qr_ordering_enabled and r.published
 and (select count(*) from public.branches x where x.restaurant_id=s.restaurant_id and x.active)=1;
 if not found then raise exception 'CONNECT_EXPIRED' using errcode='42501'; end if;
 select * into c from public.romano_connect_conversations where guest_token_id=tok.id for update;
 if p_op='get' then
  if c.id is null then return jsonb_build_object('conversation',null,'messages','[]'::jsonb); end if;
  if c.expires_at<=clock_timestamp() then raise exception 'CONNECT_EXPIRED' using errcode='42501'; end if;
  return public.romano_connect_snapshot(c.id,false);
 end if;
 if c.id is null then
  if p_language is null or p_language not in ('fa','en','tr','ar') then raise exception 'CONNECT_INVALID_MESSAGE' using errcode='22023'; end if;
  insert into public.romano_connect_conversations(guest_token_id,language,created_at,updated_at,expires_at)
  values(tok.id,p_language,v_now,v_now,v_exp) returning * into c;
 end if;
 perform public.romano_connect_append(c.id,null,p_client_id,p_language,p_text,null);
 return public.romano_connect_snapshot(c.id,false);
end $$;

create function public.romano_connect_staff(p_restaurant uuid,p_actor uuid,p_op text,p_conversation uuid default null,p_expected integer default null,p_client_id uuid default null,p_language text default null,p_text text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.romano_connect_conversations%rowtype; v_now timestamptz:=clock_timestamp(); v_live boolean;
begin
 if not exists(select 1 from public.restaurant_memberships rm join public.users u on u.id=rm.user_id
 where rm.restaurant_id=p_restaurant and rm.user_id=p_actor and rm.role in ('owner','manager') and u.active)
 or (select count(*) from public.branches b where b.restaurant_id=p_restaurant and b.active)<>1
 then raise exception 'CONNECT_FORBIDDEN' using errcode='42501'; end if;
 if p_op='list' then
  return coalesce((select jsonb_agg(q.payload order by q.updated_at desc,q.id) from (
    select conv.id,conv.updated_at,public.romano_connect_metadata(conv.id,true) ||
    jsonb_build_object('lastMessage',(select public.romano_connect_message_json(m,true) from public.romano_connect_messages m
     where m.conversation_id=conv.id order by m.sequence desc limit 1)) payload
    from public.romano_connect_conversations conv join public.table_session_tokens t on t.id=conv.guest_token_id
    join public.branches b on b.id=t.branch_id and b.restaurant_id=t.restaurant_id and b.active
    where t.restaurant_id=p_restaurant and conv.expires_at>v_now-interval '24 hours'
    order by conv.updated_at desc,conv.id limit 50
  ) q),'[]'::jsonb);
 end if;
 if p_op is null or p_op not in ('get','send','assign','resolve','reopen','close') then raise exception 'CONNECT_INVALID_REQUEST' using errcode='22023'; end if;
 select c0.* into c from public.romano_connect_conversations c0 join public.table_session_tokens tok on tok.id=c0.guest_token_id
 join public.branches b on b.id=tok.branch_id and b.restaurant_id=tok.restaurant_id and b.active
 where c0.id=p_conversation and tok.restaurant_id=p_restaurant and c0.expires_at>v_now-interval '24 hours' for update of c0;
 if not found then raise exception 'CONNECT_NOT_FOUND' using errcode='42501'; end if;
 if p_op='get' then return public.romano_connect_snapshot(c.id,true); end if;
 v_now:=clock_timestamp();
 select exists(select 1 from public.table_session_tokens tok
 join public.table_sessions s on s.id=tok.table_session_id and s.restaurant_id=tok.restaurant_id and s.branch_id=tok.branch_id
 join public.restaurant_tables t on t.id=s.table_id and t.restaurant_id=s.restaurant_id and t.branch_id=s.branch_id
 join public.branches b on b.id=t.branch_id and b.restaurant_id=t.restaurant_id
 join public.restaurants r on r.id=t.restaurant_id
 where tok.id=c.guest_token_id and tok.revoked_at is null and tok.expires_at>v_now and s.status='open' and s.expires_at>v_now
 and t.active and b.active and b.qr_ordering_enabled and r.published) into v_live;
 if not v_live or c.expires_at<=v_now then raise exception 'CONNECT_EXPIRED' using errcode='55000'; end if;
 if p_op='send' then
  perform public.romano_connect_append(c.id,p_actor,p_client_id,p_language,p_text,p_expected);
 else
  if p_expected is distinct from c.version then raise exception 'CONNECT_STALE' using errcode='40001'; end if;
  if c.status='closed' or (p_op in ('assign','resolve') and c.status not in ('new','in_progress'))
  or (p_op='reopen' and c.status<>'resolved') then raise exception 'CONNECT_INACTIVE' using errcode='55000'; end if;
  update public.romano_connect_conversations set version=version+1,updated_at=greatest(v_now,updated_at),
   status=case p_op when 'assign' then 'in_progress' when 'resolve' then 'resolved' when 'reopen' then 'new' when 'close' then 'closed' else status end,
   assignee_id=case p_op when 'assign' then p_actor when 'reopen' then null else assignee_id end where id=c.id;
 end if;
 return public.romano_connect_snapshot(c.id,true);
end $$;
-- Never rely on default privileges, or expose the server helpers to browser roles.
revoke all on function public.romano_connect_message_json(public.romano_connect_messages,boolean),
 public.romano_connect_metadata(uuid,boolean),public.romano_connect_snapshot(uuid,boolean),
 public.romano_connect_append(uuid,uuid,uuid,text,text,integer),
 public.romano_connect_guest(text,text,uuid,text,text),public.romano_connect_staff(uuid,uuid,text,uuid,integer,uuid,text,text)
 from public,anon,authenticated;
grant execute on function public.romano_connect_message_json(public.romano_connect_messages,boolean),
 public.romano_connect_metadata(uuid,boolean),public.romano_connect_snapshot(uuid,boolean),
 public.romano_connect_append(uuid,uuid,uuid,text,text,integer),
 public.romano_connect_guest(text,text,uuid,text,text),public.romano_connect_staff(uuid,uuid,text,uuid,integer,uuid,text,text)
 to service_role;
commit;
