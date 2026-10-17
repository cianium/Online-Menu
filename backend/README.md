# ROMANO backend

Fastify + PostgreSQL API that also serves the customer menu (`/`) and the admin panel (`/admin/`).

## Setup
1. `cp backend/.env.example backend/.env` and fill in `DATABASE_URL`, `BOOTSTRAP_ADMIN_EMAIL` and a
   `BOOTSTRAP_ADMIN_PASSWORD` of at least 12 characters (there is no default password on purpose).
2. `npm --prefix backend install`
3. `npm run backend:migrate` — applies `backend/migrations/*.sql` in order (tracked in `schema_migrations`).
4. `npm run backend:seed` — creates the owner account (once) and the demo menu in fa/en/tr/ar. Re-running it never resets a password or overwrites edited content.
5. `npm run backend:start` → `http://localhost:3000/` and `http://localhost:3000/admin/`.

Behind a reverse proxy set `TRUST_PROXY=1`; in production `COOKIE_SECURE` is always enforced and `DATABASE_URL` is required.

## Security model
- Passwords: Argon2id. Sessions: random token, only its SHA-256 is stored, HttpOnly cookie, max 5 per user.
- CSRF: double-submit cookie **plus** server-side hash; rotated on login.
- Login: 8 attempts / 10 min / IP, constant-time-ish (dummy hash for unknown users).
- Tenancy: the restaurant is resolved from the user's memberships. `:restaurantId` in a URL is only a selector among the user's own restaurants; anything else returns 404.
- RBAC: `viewer < editor < manager < owner` (delete/settings need manager).
- CSP is enabled (`script-src 'self'`); only `assets/ css/ js/ admin/ uploads/` and four root files are served — never `backend/`, `docs/`, `qa/`.
- Uploads: JPEG/PNG/WebP only, signature-checked (declared MIME is not trusted), ≤ 2 MB, stored under random names. SVG is rejected.

## Automatic translation
Set `ANTHROPIC_API_KEY` (server only) and optionally `TRANSLATION_MODEL` in `backend/.env`. Text typed in the admin is translated into fa/en/tr/ar in the background; failures are logged (ids only, never menu text) and retried on the next edit or restart. Cost control: unchanged text is never re-sent, and one save starts at most `MAX_TRANSLATIONS_PER_REQUEST` jobs. Machine translations are labelled `auto` in the database and can be overridden per language.

## Tests
`npm test` (unit tests for the dependency-free helpers in `backend/lib`). **The HTTP routes and SQL have not been run against a live PostgreSQL yet** — see `docs/PRODUCTION_STATUS.md`.
