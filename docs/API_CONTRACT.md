# ROMANO API Contract — v1

All responses use `{ "data": ..., "error": null | { "code", "message" }, "requestId": "..." }`.
Mutations require the `X-CSRF-Token` header (value of the `romano_csrf` cookie; `GET /auth/csrf` issues one).
The unversioned `/api/*` prefix is a deprecated alias of `/api/v1/*` (responses carry `Deprecation: true`).

## Auth
| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/auth/csrf` | issues CSRF cookie + token |
| POST | `/api/v1/auth/login` | `{ email, password }`, rate-limited, rotates CSRF token |
| POST | `/api/v1/auth/logout` | |
| GET | `/api/v1/auth/me` | `data: null` when signed out |
| GET | `/api/v1/admin/me` | 401 when signed out; lists memberships |

## Public (published/active content only, cached 30 s)
- `GET /api/v1/public/restaurants/:slug/menu?lang=fa|en|tr|ar`
- `GET /api/v1/public/restaurants/:slug/categories?lang=`
- `GET /api/v1/public/restaurants/:slug/products?lang=&category=<category slug>`

Each item carries the resolved text for `lang` (fallback: restaurant default language → `fa`, never `null`) **and** a `translations` map for all languages. `category` on a product is the category **slug** (`categories[].id`).

## Admin (membership + role enforced server-side)
`/api/v1/admin/restaurants/:restaurantId/...` is canonical; `/api/v1/admin/...` (no id) targets the user's first restaurant.

| Method | Path | Min role |
|---|---|---|
| GET | `/data` (full admin catalog), `` (restaurant) | viewer |
| PATCH | `` or `/settings` | manager |
| PUT | `/snapshot` — `mode: "merge"` (never deletes) or `"replace"` (deletes rows not in the payload; refuses zero categories) | editor |
| POST / PATCH | `/categories[/:id]`, `/products[/:id]` — PATCH changes only the fields sent | editor |
| DELETE | `/categories/:id` (409 if not empty), `/products/:id` | manager |
| POST | `/media` — `{ dataUrl }` → `{ url }` | editor |
| GET | `/audit-logs` | manager |

Images in payloads must be http(s) URLs or `assets/`/`uploads/` paths; `data:` images must be uploaded via `/media` first.

## Automatic translation
Saving products/categories/settings stores the text exactly as typed and returns immediately; translation into the other languages runs afterwards (seconds, usually). `translations` in API responses fills in when it finishes, so a public menu may briefly show the typed language for other languages (public responses are cached ~30 s).
Rows carry an internal `origin` (`source` | `manual` | `seed` | `auto`). Sending an explicit `translations: { en: { name } }` in a payload stores it as `manual`, which automatic translation never overwrites.
Disabled when `ANTHROPIC_API_KEY` is empty or `AUTO_TRANSLATE=false` (`GET /health` reports `autoTranslation`).

## Not yet implemented
Draft/publish/rollback versions, per-language editing UI, plans/quotas, object storage/CDN. Add explicit draft/published versions before several staff edit a live menu.
