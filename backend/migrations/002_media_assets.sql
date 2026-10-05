-- 002 — uploaded images (validated server-side; files live in UPLOAD_DIR)
create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  uploaded_by uuid references users(id) on delete set null,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  byte_size integer not null check (byte_size > 0),
  created_at timestamptz not null default now(),
  unique (restaurant_id, file_name)
);
create index if not exists idx_media_restaurant on media_assets(restaurant_id, created_at desc);
