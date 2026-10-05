# ROMANO Changelog

## 4.7.0 — Automatic multilingual content
### Added
- Content an admin enters (products, categories, restaurant info) is translated into fa/en/tr/ar **in the background** after saving, by a server-side translation service (Anthropic Messages API; `ANTHROPIC_API_KEY` + `TRANSLATION_MODEL` in `backend/.env`). The admin may write in any of the four languages; the language is detected per field.
- Saving never waits for, or fails because of, translation. Unchanged content is never re-translated (source hash), curated seed translations are adopted, never replaced, and text a person wrote for a language (`manual`) is never overwritten. A per-save cap (`MAX_TRANSLATIONS_PER_REQUEST`) limits cost.
- Migrations 003/004 (translation `origin`, `source_hash`); seed marks curated rows.
- No visible change to the admin form or the customer menu.
### Fixed
- Customer menu now shows server-provided translations for categories and restaurant info in every language (including switching back to Persian), not only products.
### Notes
- Automatic translation needs the backend and an API key. In static/demo mode (no backend) admin content stays in the language it was typed in.
- Not verified against the live translation API or PostgreSQL (see docs/PRODUCTION_STATUS.md).

## 4.6.3
- Fixed: the Share / Copy-link buttons in the product modal (and skip link, scroll-button and back-to-top aria-labels, logo alt) were created once and never re-translated after a language switch. They now follow the current language.
- Known: products added in the admin only have Persian text; see the multilingual-editor item in docs/PRODUCTION_STATUS.md.

## 4.6.2 — Review & hardening pass
### Fixed
- Customer menu: three ReferenceErrors (`escapeHtml`, `escapeAttr`, `input`) aborted `initMenuSearch`, so search, the category rail, back-to-top and related enhancements never started. The language-change listener had been pasted outside its function.
- Customer menu: product modal and navigation drawer now show translated content; badges are translated from a shared dictionary; an open modal re-renders on language change; fixed a Persian letter inside the Arabic address; the missing "Special" badge translations.
- Admin: `initializeAdmin()` was never called, so no handlers were attached and every list was empty. Added a real e-mail/password login form (server session) and a clearly labelled local demo mode when no backend exists. Removed the Google Identity script.
- Admin: layout now follows `<html dir>` (logical properties) so English/Turkish are truly LTR; consolidated the mobile header into one row; fixed an i18n rule that corrupted the "Featured selection" label.
- Backend: stopped serving the whole project directory; configurable `TRUST_PROXY` (was hard-coded `true`, which allowed rate-limit bypass); CSP enabled; Secure cookies enforced in production; seed no longer has a default password or resets passwords; login timing equalised; CSRF rotated on login.
- Backend data: snapshot sync can now delete (`mode: "replace"`), writes en/tr/ar translations, uploads images through a validated endpoint instead of rejecting them, public API falls back to the default language instead of returning `null`, `category` now returns the category slug, partial PATCH no longer wipes fields.
- PWA/SEO: real 192/512/maskable icons, Open Graph locale tags, service worker no longer caches error responses; broken `webpack` CI replaced with a real one.
### Added
- Versioned migrations (`npm run backend:migrate`), `media_assets` table, `updated_at` triggers, case-insensitive unique e-mail.
- `/api/v1` canonical routes matching `docs/API_CONTRACT.md` (legacy `/api` kept as deprecated alias).
- Unit tests for backend helpers; static audit now guards the regressions above.

## 4.6.2 — Production Foundation (earlier work)
- Added real Fastify + PostgreSQL backend.
- Added Argon2id authentication and server-side sessions.
- Removed production dependency on the browser-side admin unlock gate.
- Added CSRF, rate limiting and security headers.
- Added tenant-aware RBAC.
- Added public menu and admin CRUD/snapshot APIs.
- Added PostgreSQL seed from the existing ROMANO menu data.
- Added Docker Compose PostgreSQL development setup.
- Added customer API-first loading with offline/local fallback.
- Updated admin login copy from Google-only to server authentication.
- Updated static QA to validate the new production boundary.
