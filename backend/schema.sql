-- ROMANO production baseline schema
create extension if not exists pgcrypto;

create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  tagline text,
  description text,
  logo_url text,
  instagram_url text,
  phone text,
  address text,
  timezone text not null default 'Asia/Tehran',
  currency text not null default 'IRR',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists restaurant_translations (
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  language_code text not null check (language_code in ('fa','en','tr','ar')),
  name text,
  tagline text,
  description text,
  address text,
  primary key (restaurant_id, language_code)
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  password_hash text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists restaurant_memberships (
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner','manager','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  session_hash text not null unique,
  csrf_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  slug text not null,
  image_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, slug)
);

create table if not exists category_translations (
  category_id uuid not null references categories(id) on delete cascade,
  language_code text not null check (language_code in ('fa','en','tr','ar')),
  name text not null,
  primary key (category_id, language_code)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category_id uuid references categories(id) on delete restrict,
  slug text not null,
  price numeric(14,2) not null default 0 check (price >= 0),
  image_url text,
  badge_code text,
  rating numeric(2,1) check (rating between 0 and 5),
  featured boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, slug)
);

create table if not exists product_translations (
  product_id uuid not null references products(id) on delete cascade,
  language_code text not null check (language_code in ('fa','en','tr','ar')),
  name text not null,
  description text,
  badge_label text,
  primary key (product_id, language_code)
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete set null,
  actor_user_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_expires on sessions(expires_at);
create index if not exists idx_memberships_user on restaurant_memberships(user_id);
create index if not exists idx_categories_restaurant_order on categories(restaurant_id, sort_order);
create index if not exists idx_products_restaurant_category_order on products(restaurant_id, category_id, sort_order);
create index if not exists idx_products_restaurant_active on products(restaurant_id, active, featured);
create index if not exists idx_audit_logs_restaurant_created on audit_logs(restaurant_id, created_at desc);
