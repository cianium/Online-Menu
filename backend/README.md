# ROMANO Production Backend

This is a real server-side foundation for the existing ROMANO UI.

## Features
- Fastify API + PostgreSQL
- Argon2id email/password authentication
- HttpOnly server sessions
- CSRF double-submit protection + server-side CSRF hash
- Rate limiting and security headers
- Tenant resolution from authenticated membership (never from client input)
- Owner/manager/editor/viewer RBAC
- Public multilingual menu endpoint for `fa/en/tr/ar`
- Admin CRUD for restaurant settings, categories and products
- Immutable audit records for privileged mutations

## Setup
1. Copy `.env.example` to `.env` and set `DATABASE_URL` and a strong bootstrap password.
2. From `backend/`, run `npm install`.
3. Run `npm run seed` once.
4. Run `npm start`.
5. Open `http://localhost:3000/` and `http://localhost:3000/admin/`.

The old localStorage UI remains available as a fallback during migration, but production deployments should use the API as the source of truth.
