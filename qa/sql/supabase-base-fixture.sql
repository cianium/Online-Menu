-- Minimal pre-order Supabase schema used only by isolated PostgreSQL QA.
-- The production catalog schema predates this repository's order migrations.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end;
$$;

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  currency text not null default 'IRR',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key default gen_random_uuid(),
  active boolean not null default true
);

create table public.restaurant_memberships (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null,
  primary key (restaurant_id, user_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  slug text not null,
  active boolean not null default true,
  unique (restaurant_id, id),
  unique (restaurant_id, slug)
);

create table public.category_translations (
  category_id uuid not null references public.categories(id) on delete cascade,
  language_code text not null,
  name text not null,
  primary key (category_id, language_code)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  slug text not null,
  price numeric(14,2) not null check (price >= 0),
  active boolean not null default true,
  unique (restaurant_id, slug)
);

create table public.product_translations (
  product_id uuid not null references public.products(id) on delete cascade,
  language_code text not null,
  name text not null,
  primary key (product_id, language_code)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  actor_user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
