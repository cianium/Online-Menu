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
| Security | Client-side admin gate | BLOCKED for production — needs backend |
| PWA | Versioned cache + no `/admin/` caching | PASS static review |
| Browser E2E | Full click/visual smoke test | NOT VERIFIED in current environment |
| Images | Demo image dimensions/compression consistency | NEEDS production asset pipeline |
