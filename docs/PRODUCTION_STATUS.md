# Production status (4.6.2) — what is and is not verified

## Verified in a real headless Chromium (this review)
- Customer menu: fa/en/tr/ar, 21 products, every product modal — 0 JS errors, 0 untranslated strings.
- Admin (local demo mode): add / edit / delete product, category modal, settings, language switch; desktop 1366px and mobile 390px; XSS probe on product name.
- Admin (server mode) against a **mock** API with the same contract: login gate, wrong-password error, load, delete persisted via `replace`, survives reload.
- `npm run qa`: syntax, static audit (with regression guards), 7 backend unit tests.

## Verified for automatic translation (4.7.0)
- Unit tests (22 total): translator request/response validation with a fake HTTP layer, retry rules, planning (manual rows protected, source language kept verbatim), change detection, queue, worker (no call for unchanged/seed content, edit-during-translation not overwritten, failure doesn't break saving).
- Browser: admin-created content (product, category, restaurant info) renders correctly in all four languages from every starting language with live switching — 80/80 checks; the same test fails 48/80 on the pre-4.7 code.

## NOT verified
- **The real translation API was never called** (no network access): prompt quality, model name and latency are untested; run a few real saves and read the results before relying on it.
- The real backend (`backend/server.mjs`) and SQL (including the new translation queries) were **never run** (no PostgreSQL / npm install in the review environment). Only `node --check` and a static route-duplicate check.
- No managed database, secrets, object storage/CDN, monitoring, backups or deployment.
- Tenant-isolation integration tests, load/performance tests, real-device RTL checks, screen-reader testing.

## Known gaps / next steps (priority order)
1. Run the backend against PostgreSQL and add API integration tests (auth, CSRF, tenant isolation, snapshot replace, media upload).
2. Replace native `alert/confirm` in admin with accessible modals.
3. Self-host the Vazirmatn/Playfair fonts (currently Google Fonts: privacy + render-blocking) and then tighten the CSP.
4. Responsive image derivatives (WebP/AVIF, 4:5); logo.png is 573 KB.
5. `og:image` / canonical / hreflang need the production domain (inject at serve time); add JSON-LD `Restaurant`.
6. Draft/publish/rollback; per-language editor in admin; per-restaurant slug routing for multi-tenant public URLs.
7. Optimistic concurrency (two staff saving a snapshot at once is last-write-wins).
