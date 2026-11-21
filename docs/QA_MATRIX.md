# ROMANO QA Matrix

| Area | Test | Current result |
|---|---|---|
| JavaScript | Node syntax check for all runtime scripts | PASS — recorded in project QA; rerun required on this branch |
| HTML | Duplicate element IDs | PASS — recorded in project QA; rerun required on this branch |
| Assets | Required local runtime assets exist | PASS — recorded in project QA; rerun required on this branch |
| i18n | Customer languages fa/en/tr/ar | PASS — static coverage recorded |
| i18n | Admin languages fa/en/tr/ar + switch control | PASS — static coverage recorded |
| Admin | Product/category/menu snapshot flows | IMPLEMENTED in code; live Supabase integration not independently verified |
| Admin auth | Supabase Auth broker, HttpOnly cookies, CSRF and tenant memberships | IMPLEMENTED in `romano-admin`; deployment/configuration not independently verified |
| Admin RBAC | owner/manager/editor/viewer role checks | IMPLEMENTED for existing admin endpoints; full user/role management UI/API not present |
| Admin operations | Orders, KDS transitions, branches, tables, QR and gateway settings | IMPLEMENTED in code; live end-to-end verification pending |
| Admin analytics | Real sales analytics and reporting endpoints | NOT VERIFIED / not included in current admin API surface reviewed |
| Admin finance | Transaction ledger and reconciliation UI/API | NOT VERIFIED / not included in current admin API surface reviewed |
| Admin backup | Tenant-safe operational backup and restore | NOT VERIFIED |
| Security | Server-side tenant checks and role guards | IMPLEMENTED in reviewed Edge Function paths; must be integration-tested |
| Security | Production secrets, function deployment and route wiring | NOT VERIFIED |
| Security | Client-side admin gate | Legacy/demo fallback must never be treated as production authorization |
| PWA | Versioned cache + no `/admin/` caching | PASS — recorded in project QA |
| Browser E2E | Full click/visual smoke test | NOT VERIFIED in current environment |
| Customer/Admin | Mobile/desktop and RTL/LTR regression on vq.3 | NOT RUN in this documentation-only branch |
| Payments | Real provider callback and reconciliation | NOT VERIFIED |
