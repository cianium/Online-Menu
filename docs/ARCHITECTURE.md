# ROMANO Target Architecture

## Current client layer
- Customer menu: HTML + vanilla JavaScript + CSS.
- Admin workspace: HTML + vanilla JavaScript + CSS.
- Shared demo data: `js/data.js`.
- Client persistence today: browser localStorage.
- Localization: `js/i18n.js` and `admin/admin-i18n.js`.

## Target commercial architecture
```text
QR / public URL
      │
      ▼
Customer Web App ──────── CDN / Image CDN
      │
      │ HTTPS JSON API
      ▼
API / Auth Layer ──────── Rate limiting / validation / audit
      │
      ├── PostgreSQL
      │     ├── restaurants (tenant)
      │     ├── users / roles / permissions
      │     ├── categories
      │     ├── products
      │     ├── product_translations
      │     ├── category_translations
      │     ├── restaurant_translations
      │     └── audit_logs
      │
      └── Object Storage / Image CDN
```

## Recommended backend boundaries
`/auth`, `/restaurants`, `/categories`, `/products`, `/public/menu`, `/media`, `/audit`, and `/health`.

## Tenancy rule
Every restaurant-owned record carries a `restaurant_id`; the API must authorize access to that tenant server-side. Do not use URL/query parameters or browser state as the authorization source.

## Data versioning
Keep a `schemaVersion` on backups and a database migration history. Client code should treat unknown future versions as incompatible instead of silently guessing.

## Multilingual content
Use one canonical entity ID with language-specific content records. This keeps product/category identity stable while allowing `fa`, `en`, `tr`, and `ar` fields to evolve independently.
