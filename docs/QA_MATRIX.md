# ROMANO QA Matrix

| Area | Test | Current result |
|---|---|---|
| JavaScript | Node syntax check for all runtime scripts | PASS |
| HTML | Duplicate element IDs | PASS |
| Assets | Required local runtime assets exist | PASS |
| i18n | Customer languages fa/en/tr/ar | PASS |
| i18n | Admin languages fa/en/tr/ar + switch control | PASS |
| Admin | Save restaurant settings | FIXED — Instagram scope bug removed |
| Admin | Product save | PASS after removing leaked Instagram validation |
| Admin | Category CRUD | PASS static review |
| Admin | Backup schema validation | HARDENED |
| Security | Imported external Instagram URL | SANITIZED |
| Security | Client-side admin gate | Legacy/demo fallback must never be treated as production authorization |
| PWA | Versioned cache + no `/admin/` caching | PASS static review |
| Browser E2E | Full click/visual smoke test | NOT VERIFIED in current environment |
| Images | Demo image dimensions/compression consistency | NEEDS production asset pipeline |
| Security | Production secrets, function deployment and route wiring | NOT VERIFIED — connected Supabase/Vercel accounts did not expose the project referenced by this repository |
| Database | Fresh-project Supabase bootstrap schema | BLOCKED — reviewed Supabase migrations are incremental and depend on pre-existing core tables/functions; baseline must be supplied/verified |
| Admin | Analytics, finance, user/role management and operational backup | NOT IMPLEMENTED in reviewed API surface; do not expose mock UI as live capability |
