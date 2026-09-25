# ROMANO Changelog

## 4.6.2 — Production Foundation
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
