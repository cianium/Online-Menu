# ROMANO 4.9.1 — Mobile editing and correctness fixes

See [the current Persian review and roadmap](docs/REVIEW_4.9.1_FA.md) for the three-package comparison, changes, verification scope and production blockers. Existing restaurant-menu functionality is preserved. This is not a production certification.

# ROMANO 4.9.0 — Customer menu update

Improved multilingual customer browsing, responsive product grids, favorites, search and price sorting. Public loading now keeps server data separate from local demo data and labels recent offline snapshots. Includes the complete 4.8.0 admin update.

See [the Persian release report](docs/CUSTOMER_4.9.0_FA.md) for behavior, test evidence and remaining integration work. Run `npm run qa` for syntax/static/unit checks. Browser suites are `npm run qa:customer` and `npm run qa:browser`; they need a local preview and Playwright/Chromium. Mocked API checks do not verify PostgreSQL or deployment.

The sections below are historical release notes.

## 4.8.0 — Admin update

This release develops and repairs the admin workspace on the 4.7.1 baseline. See [the release report](docs/ADMIN_4.8.0_FA.md) for changes, verification and remaining production requirements. Customer-menu source and backend behavior are unchanged. Older audit documents below describe earlier releases.

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
# Online-Menu
# Romano
