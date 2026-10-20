-- Private per-project QR signing key, generated in the database. Only trusted Edge
-- Functions using service_role can request it; never return it to any browser.
create schema if not exists romano_private;
revoke all on schema romano_private from public, anon, authenticated;
create table if not exists romano_private.signing_material (
  purpose text primary key,
  value text not null check (char_length(value) >= 64),
  created_at timestamptz not null default now()
);
revoke all on romano_private.signing_material from public, anon, authenticated;
insert into romano_private.signing_material(purpose,value)
values (
  'table_qr_v1',
  replace(gen_random_uuid()::text, '-', '') ||
  replace(gen_random_uuid()::text, '-', '') ||
  replace(gen_random_uuid()::text, '-', '')
)
on conflict (purpose) do nothing;

create or replace function public.romano_qr_signing_material()
returns text
language sql
stable
security definer
set search_path = ''
as $qr_material$
  select value from romano_private.signing_material where purpose = 'table_qr_v1'
$qr_material$;
revoke all on function public.romano_qr_signing_material() from public, anon, authenticated;
grant execute on function public.romano_qr_signing_material() to service_role;
