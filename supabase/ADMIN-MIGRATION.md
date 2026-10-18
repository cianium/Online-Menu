# ROMANO admin → Supabase migration

Status: **staged, NOT the active admin API**. This branch contains an independently
deployed Supabase Edge Function and restricted SQL migrations. Public customer
menu routes already use Supabase; legacy admin routes remain untouched.

## Architecture

- `romano-admin` uses **Supabase Auth** to verify a real account (passwords are
  verified by Supabase, not stored in our application tables).
- The matching UUID in `public.users` must have `active=true`; a membership in
  `public.restaurant_memberships` grants a restaurant role.
- Auth sessions use `Secure; HttpOnly; SameSite=Lax` cookies scoped to `/api/v1`.
  Mutating requests additionally require a CSRF cookie/header pair and an
  approved `Origin` (default `https://food.kiankhayat.me`).
- Edge Function uses Supabase's built-in runtime secrets on the server.
  **Never add the service-role key, auth tokens or passwords to GitHub or Vercel
  frontend environment variables.**
- The `romano_apply_snapshot` Postgres function is an all-or-nothing transaction.
  It checks the actor, restaurant membership, role and deletion policy again
  server-side. Only `service_role` can execute it; anon/authenticated cannot.
- Uploaded image bytes are MIME-signature checked and limited to 2 MiB.
  Object path includes the restaurant UUID. The bucket is publicly readable
  because product images are public, but only the authenticated Edge Function
  uploads (using service-role authority); metadata is in `public.media_assets`.

## Initial owner onboarding (manual, one time)

**Do not set a default password or create an anonymous setup endpoint.**

1. In Supabase → **Authentication → URL Configuration**, set the correct
   production site URL and allowed callback URLs for the admin password/invite
   flow (on `food.kiankhayat.me`). Review SMTP delivery and email confirmation.
2. In **Authentication → Users**, securely invite the first owner by email.
   The owner should follow the email link and set their own strong password.
3. Once their email is verified, execute the following in **SQL Editor** after
   replacing `OWNER_EMAIL_HERE`. **Never paste a password into SQL.**

```sql
do $$
declare
  target_user uuid;
begin
  select id into target_user
    from auth.users
   where lower(email)=lower('OWNER_EMAIL_HERE')
     and email_confirmed_at is not null;
  if target_user is null then
    raise exception 'No confirmed Supabase Auth user for this email';
  end if;

  insert into public.users(id,email,display_name,active)
  select id,email,coalesce(raw_user_meta_data->>'full_name',email),true
    from auth.users where id=target_user
  on conflict (id) do update set
    email=excluded.email, active=true;

  insert into public.restaurant_memberships(restaurant_id,user_id,role)
  select id,target_user,'owner'
    from public.restaurants where slug='romano'
  on conflict (restaurant_id,user_id) do update set role='owner';
end $$;
```

4. Verify that a signed-in owner gets `/auth/me` with the expected membership,
   `/admin/data` can read their menu, and a controlled test edit through
   `/admin/snapshot` persists and is visible in the customer menu.
5. Test image upload and delete/rollback behavior. Check all four languages and
   RTL, console errors, and mobile/Desktop admin screens.

## Cutover (NOT performed yet)

Only after the authenticated end-to-end tests are green, add **two Vercel
rewrites** to the existing `vercel.json` without changing the public rewrite:

- `/api/v1/auth/:path*` → `https://tjrzeourqvahtocwnzwd.supabase.co/functions/v1/romano-admin/auth/:path*`
- `/api/v1/admin/:path*` → `https://tjrzeourqvahtocwnzwd.supabase.co/functions/v1/romano-admin/admin/:path*`

The existing `admin/api.js` contract is retained (CSRF, `auth/me`, login,
logout, `admin/data`, `admin/snapshot`, `admin/media`). Confirm that
Vercel forwards multiple `Set-Cookie` headers and request `Origin`/cookies.
Use the real custom domain for browser testing. The strict allowed-origin list
can be changed in the Edge Function secret
`ROMANO_ADMIN_ALLOWED_ORIGINS` (comma-separated HTTPS origins).

**Rollback:** remove only these two admin/auth rewrites, then deploy;
do not delete Supabase accounts, migrations or menu data.

## Limitations

- No initial owner has been invited/provisioned yet.
- The legacy REST endpoints for separate category/product CRUD, audit-log
  screens and Settings are **not fully reimplemented**; the current admin UI
  primarily uses the snapshot workflow. Do not migrate external integrations
  that use these endpoints until separately implemented and tested.
- Supabase Auth rate limits must be reviewed against the former Fastify
  `8 attempts / 10 minutes` login policy; apply appropriate WAF rate limits.
- Automatic translation and order processing are separate work streams; do
  not represent them as migrated.
