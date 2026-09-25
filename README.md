# ROMANO


# Rv4.6.1 Production Preparation

This package is the corrected engineering baseline for ROMANO. See `docs/PRODUCTION_STATUS.md`, `docs/ARCHITECTURE.md` and `docs/QA_MATRIX.md` before integrating a backend.

Run static checks with `node qa/static-audit.mjs` (or `npm run qa:static`).


## Production foundation

ROMANO now includes a server-backed production foundation under `backend/`: PostgreSQL, Argon2id authentication, HttpOnly sessions, CSRF protection, rate limiting, tenant-aware RBAC, public menu API, admin CRUD and audit logs.

### Local development

1. Start PostgreSQL with `docker compose up -d postgres`.
2. Copy `backend/.env.example` to `backend/.env` and set the development database URL/password.
3. Run `npm --prefix backend install`.
4. Run `npm --prefix backend run seed`.
5. Run `npm --prefix backend start`.
6. Open `/` for the customer menu and `/admin/` for the secure admin console.

Do not use the demo bootstrap password in production. Put secrets in the deployment secret manager.
