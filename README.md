<div align="center">

# RAMEN · Online Menu

**Multilingual digital menus and restaurant management — under active development.**

[![CI](https://github.com/cianium/Online-Menu/actions/workflows/ci.yml/badge.svg)](https://github.com/cianium/Online-Menu/actions/workflows/ci.yml)
[![Repository](https://img.shields.io/badge/Repository-Online--Menu-0B7285?logo=github)](https://github.com/cianium/Online-Menu)
![Status](https://img.shields.io/badge/Status-Active%20development-F59E0B)

**Customer experience · Restaurant administration · API development**

</div>

> **Project identity:** RAMEN (رامن) is the product brand; `Online-Menu` is the existing GitHub repository name. `ROMANO` remains in some legacy code identifiers, deployment function names, and historical documents for compatibility. Those identifiers are **not** a statement of the current brand.

## Overview

RAMEN is a developing restaurant software project built around a multilingual customer-facing digital menu and an administrative workspace. The repository contains a browser client, an admin interface, a Fastify/PostgreSQL backend, Supabase integration code, and automated checks.

The repository is **not presented as a complete production POS, delivery service, or marketplace**. Those capabilities are potential future product directions, not verified features of this codebase.

## What is in this repository?

| Area | Implemented in source | Verification boundaries |
| --- | --- | --- |
| Customer menu | Product/category browsing, search, favorites, pricing views, responsive interface | Local browser QA exists; live coverage is separate |
| Internationalization | Persian, English, Turkish, Arabic; RTL and LTR interfaces | Reviewed in previous browser QA; verify with real content |
| Admin workspace | Product/category editing, images, settings, snapshot-oriented data updates | Mock-based browser QA and some live smoke checks; end-to-end write validation needed |
| Fastify backend | PostgreSQL migrations, authentication, RBAC, public/admin API routes, audit logging | Source exists; real database integration and tenant-boundary tests needed |
| Supabase integration | Admin Edge Function, SQL migrations, authentication and proxy configuration | Deployment state must be checked against the running environment |
| Test tooling | Node.js unit/static checks, browser scenarios, API/proxy smoke scripts | Not a comprehensive security or production certification |

## Architecture and source layout

```text
Customer menu (index.html, js/, css/)
               |
               +--> Public menu API -> configured Supabase public Edge endpoint
               |
Admin workspace (admin/)
               |
               +--> Auth/admin API -> Supabase admin Edge Function

Alternative/legacy local backend: backend/ (Fastify + PostgreSQL)
Database + storage definitions: backend/migrations/ and supabase/migrations/
Checks: qa/, backend/test/, .github/workflows/
Documentation and QA reports: docs/
```

**Important:** `vercel.json` currently proxies public requests to a `romano-public` Supabase function, but that function's source is not present in `supabase/functions/` in this repository. Only `romano-admin` is currently versioned here. Until the missing source and live deployment are reconciled, the deployed API cannot be reproduced solely from this repository. Some older documents describe a previous stage of the admin cutover and need updating.

## Run the local Fastify/PostgreSQL development path

Requirements: Node.js 22+ recommended, PostgreSQL, npm.

```bash
git clone https://github.com/cianium/Online-Menu.git
cd Online-Menu
cp backend/.env.example backend/.env
# Edit backend/.env with LOCAL development credentials.
docker compose up -d postgres
npm --prefix backend install
npm run backend:migrate
npm run backend:seed
npm run backend:start
```

Then visit `http://localhost:3000/` for the customer menu and `http://localhost:3000/admin/` for the admin workspace.

These commands target the **Fastify local development backend**, not the live Supabase deployment. Never commit `.env`, database passwords, access tokens, or service-role keys.

## QA commands

```bash
npm run qa              # JavaScript syntax, static audit, backend unit tests
npm run qa:production   # Configuration preflight for the legacy Fastify deployment path
```

Additional browser tests:

```bash
npm run qa:customer
npm run qa:browser
```

Browser tests need the appropriate local preview and Playwright/Chromium setup. The scripts are not equivalent to full live-database or production validation. Live Supabase/proxy checks are under `qa/` and should be run only against authorized, configured environments.

See [the current application review](docs/REVIEW_4.9.1_FA.md), [architecture notes](docs/ARCHITECTURE.md), and [production caveats](docs/PRODUCTION_STATUS.md). These documents contain historical information and are being reconciled with the newer Supabase cutover.

## Current engineering priorities

- [ ] Reconcile the active Vercel/Supabase deployment paths with source-controlled configuration and documentation.
- [ ] Restore/version-control the `romano-public` Edge Function source used by the configured proxy.
- [ ] Verify authenticated admin operations and media uploads against the live-compatible environment.
- [ ] Add repeatable PostgreSQL/Supabase integration checks, including role permissions and cross-restaurant isolation.
- [ ] Add tests for concurrent updates and a documented backup/restore procedure.
- [ ] Add a reproducible dependency-locking and deployment strategy.
- [ ] Complete a gradual RAMEN branding migration while preserving legacy identifiers required by running clients.

## Product direction (planned, not implemented here)

The broader RAMEN vision may grow beyond menus into restaurant operations, QR ordering, and a food-focused discovery/order/delivery experience with customer, merchant, and courier roles. These are **roadmap concepts**; this repository should not be interpreted as proof that those systems are currently built or available.

## Contributing and project status

This is an evolving personal engineering project. Issues and proposals are welcome. Please open an issue describing the problem and the expected behavior before making large changes.

**Maintenance:** [Kian Khayat](https://github.com/cianium)  
**Repository:** https://github.com/cianium/Online-Menu

<!-- Before adding a LICENSE, choose the intended terms deliberately; the current repository is public but has no confirmed license. -->