<div align="center">

# ROMANO

**A multilingual digital restaurant menu with an admin workspace — built to grow into a multi-restaurant SaaS.**

Persian · English · Turkish · Arabic &nbsp;|&nbsp; RTL / LTR &nbsp;|&nbsp; Mobile-first &nbsp;|&nbsp; PWA



</div>

---

## Overview

ROMANO has two surfaces:

| Surface | Path | Purpose |
|---|---|---|
| **Customer menu** | `/` | Fast, food-first public menu reached by QR code or link. |
| **Admin workspace** | `/admin/` | Restaurant staff manage settings, categories and products. |

The frontend is plain **HTML + CSS + vanilla JavaScript** (no framework, no build step). A **Fastify + PostgreSQL** backend adds real authentication, per-restaurant data isolation, an API and automatic translation.

The project runs in two modes:

| Mode | What you need | What works |
|---|---|---|
| **Static / demo** | Any static host (e.g. GitHub Pages) or `index.html` | Customer menu, and an admin panel in a clearly labelled *local demo mode*. Changes are stored **only in that browser** (`localStorage`). |
| **Full (server)** | Node.js 20+, PostgreSQL | Secure login, shared data, image uploads, API, audit log, automatic translation. |

## Features

**Customer menu**
- Four languages with correct RTL/LTR layout, switchable at any time.
- Category navigation, search, product modal, deep links, share / copy-link.
- Responsive, accessible (focus handling, Escape to close, reduced-motion support).
- Installable PWA with a service worker.

**Admin workspace**
- Dashboard with menu-health indicators.
- Add, edit, delete and hide products and categories; restaurant settings; image upload.
- Fully translated admin interface (fa / en / tr / ar).

**Backend**
- Argon2id password hashing, HttpOnly session cookies, CSRF protection, rate limiting, CSP and security headers.
- Multi-tenant model: the restaurant is always resolved from the signed-in user's membership, never from the browser.
- Roles: `viewer < editor < manager < owner`. Audit log for privileged changes.
- Versioned SQL migrations and a documented REST API (`/api/v1`).

**Automatic translation**
- Staff can write content in any of the four languages; the server detects the language and translates it into the others in the background.
- Text written by a person is never overwritten, unchanged text is never re-translated, and saving never waits for (or fails because of) the translation service.
- Requires the backend and an API key (see [Configuration](#configuration)). Without a key, content simply stays in the language it was typed in.

## Quick start

### 1. Static / demo (no install)

```bash
# any static server works, for example:
python3 -m http.server 8080
```

Open `http://localhost:8080/` for the menu and `http://localhost:8080/admin/` for the admin panel (local demo mode).

### 2. Full stack (with backend)

Requirements: Node.js 20+, PostgreSQL (or Docker).

```bash
# 1) database (optional, if you do not already have PostgreSQL)
docker compose up -d postgres

# 2) configuration
cp backend/.env.example backend/.env
#    edit backend/.env: set DATABASE_URL, BOOTSTRAP_ADMIN_EMAIL and a
#    BOOTSTRAP_ADMIN_PASSWORD of at least 12 characters

# 3) install, create tables, load the demo menu and the owner account
npm run backend:install
npm run backend:migrate
npm run backend:seed

# 4) run
npm run backend:start
```

Then open `http://localhost:3000/` (menu) and `http://localhost:3000/admin/` (sign in with the account you set in `.env`).

> There is intentionally **no default admin password**. Running the seed again never resets an existing password or overwrites edited content.

## Configuration

All settings live in `backend/.env` (copy from `backend/.env.example`). Never commit this file.

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. **Required in production.** |
| `NODE_ENV` | `production` enforces secure cookies and refuses unsafe configuration. |
| `PORT`, `HOST` | Server address (default `3000`, `0.0.0.0`). |
| `COOKIE_SECURE` | Always on in production; `false` is honoured only for plain-HTTP local development. |
| `TRUST_PROXY` | Number of reverse proxies in front of the app (e.g. `1`). Keep `false` when exposed directly. |
| `SESSION_TTL_SECONDS` | Session lifetime (default 7 days). |
| `UPLOAD_DIR` | Where uploaded images are stored. Use a persistent volume. |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_NAME` | Used once by the seed to create the owner account (password ≥ 12 characters). |
| `ANTHROPIC_API_KEY` | Enables automatic translation. **Server-side only.** Leave empty to disable. |
| `TRANSLATION_MODEL` | Translation model name (see `.env.example`). |
| `AUTO_TRANSLATE` | Set to `false` to switch automatic translation off. |
| `MAX_TRANSLATIONS_PER_REQUEST` | Cost guard: maximum translation jobs started by one save. |

## Project structure

```
index.html              Customer menu entry point
js/                     Customer runtime (app.js), data/seed (data.js), i18n (i18n.js), API client (public-api.js)
css/                    Base styles (style.css) and ROMANO presentation system (romano.css)
admin/                  Admin workspace: HTML, runtime, i18n, API client, styles
backend/
  server.mjs            Fastify API + static file server
  migrate.mjs           Applies backend/migrations/*.sql in order
  seed.mjs              Creates the owner account and the demo menu (fa/en/tr/ar)
  migrations/           Versioned SQL schema
  lib/                  Security, media validation, translation (tested helpers)
  test/                 Unit tests
docs/                   Architecture, API contract, i18n model, QA, launch and production status
qa/static-audit.mjs     Static audit and regression guards
sw.js, manifest.webmanifest   PWA
docker-compose.yml      Local PostgreSQL
```

## Languages and RTL

Supported codes: `fa`, `en`, `tr`, `ar`. Persian and Arabic switch the whole layout to RTL.

UI text and restaurant content are separate things: interface strings live in `js/i18n.js` and `admin/admin-i18n.js`, while products, categories and restaurant details are stored per language (`*_translations` tables) with stable entity IDs. When a translation is missing the app falls back to the restaurant's default language, never to an empty value.

## API

Versioned under `/api/v1`. Public endpoints return only published, active content; admin endpoints require a session, a CSRF token and a sufficient role. Full reference: [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).

```
GET  /api/v1/public/restaurants/:slug/menu?lang=fa|en|tr|ar
POST /api/v1/auth/login
GET  /api/v1/admin/restaurants/:restaurantId/data
PUT  /api/v1/admin/restaurants/:restaurantId/snapshot
POST /api/v1/admin/restaurants/:restaurantId/media
```

## Quality checks

```bash
npm run qa          # syntax checks + static audit + backend unit tests
npm run qa:static   # static audit only
npm test            # backend unit tests only
```

The static audit also guards against regressions found in past reviews (e.g. serving the whole project directory, inline scripts that break the CSP, untranslated seed products).

## Status

This is a production-oriented foundation, not a finished hosted product. Be aware of what has and has not been verified:

- The customer menu and admin panel were tested in a headless browser (four languages, desktop and mobile).
- The backend is covered by unit tests of its helpers; it still needs an end-to-end run against a real PostgreSQL database and the live translation service before it is relied on in production.
- Not included yet: managed database and secrets, object storage / image CDN, monitoring and backups, a per-language editor in the admin, draft/publish/rollback, billing and plans.

See [`docs/PRODUCTION_STATUS.md`](docs/PRODUCTION_STATUS.md) for the detailed, up-to-date list and [`docs/CHANGELOG.md`](docs/CHANGELOG.md) for history.

## Documentation

| File | Contents |
|---|---|
| `docs/ARCHITECTURE.md` | System design and target SaaS architecture |
| `docs/API_CONTRACT.md` | REST API reference |
| `docs/I18N_CONTENT_MODEL.md` | Multilingual content model |
| `docs/QA_MATRIX.md`, `docs/LAUNCH_CHECKLIST.md` | Testing and launch checklists |
| `docs/PRODUCTION_STATUS.md` | What is and is not verified, known gaps |
| `docs/CHANGELOG.md` | Release history |
| `backend/README.md` | Backend setup and security model |

## Contributing

Keep changes scoped, localized and secure:

- Every new user-facing string must exist in all four languages.
- Check RTL and LTR layouts for any UI change.
- Authorization is always enforced on the server; client state is never a security boundary.
- Never commit secrets (`backend/.env`, API keys, database passwords).
- Run `npm run qa` before opening a pull request.
