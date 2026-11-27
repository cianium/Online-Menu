-- Phone identities are optional for existing password accounts. No role is accepted from a client.
alter table users add column if not exists phone text;
alter table users alter column email drop not null;
alter table users add constraint users_identity_present check (email is not null or phone is not null);
alter table users add constraint users_phone_e164 check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$');
create unique index users_phone_unique on users(phone) where phone is not null;
create table phone_auth_invites (
  digest text primary key check (length(digest)=64),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create table phone_auth_challenges (
  digest text primary key check (length(digest)=64),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  otp_digest text not null check (length(otp_digest)=64),
  display_name text,
  invite_digest text references phone_auth_invites(digest),
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index phone_auth_challenges_phone_time on phone_auth_challenges(phone,created_at desc);
create index phone_auth_challenges_expiry on phone_auth_challenges(expires_at);
-- Retain short-lived counters separately from account data; no phone enumeration of roles.
create table phone_auth_limits (
  key text primary key,
  window_start timestamptz not null,
  hits integer not null check(hits > 0)
);
