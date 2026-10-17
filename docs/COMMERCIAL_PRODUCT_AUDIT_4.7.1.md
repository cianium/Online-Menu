# ROMANO 4.7.1 — Commercial Product Audit

## Executive assessment

The codebase is a strong prototype / early product foundation, not yet a sell-and-forget SaaS. It already contains a multilingual customer menu, responsive admin workspace, Fastify API, PostgreSQL schema/migrations, session authentication, CSRF protection, tenant memberships/RBAC, audit logging, media validation, automatic translation infrastructure, backup/restore and automated unit/static checks.

## Fixes applied in 4.7.1

- Aligned admin image validation with the backend's real 2 MB media limit. The UI previously accepted 12 MB while the server rejected anything above 2 MB.
- Aligned CSP with the supported image URL model by allowing HTTPS image sources; the validator already accepts HTTPS URLs.
- Added a branded accessible confirmation dialog for destructive/admin actions instead of relying on native browser confirmations where the enhanced admin layer handles them.
- Added responsive dialog actions for narrow mobile layouts.
- Re-ran syntax, static audit and all 22 Node tests after the changes.

## Commercial blockers — P0

1. Run the real backend against PostgreSQL and add integration tests for login/session rotation, CSRF, tenant isolation, RBAC, CRUD, snapshot replacement and media upload.
2. Add optimistic concurrency/version checks. Snapshot writes are currently vulnerable to last-write-wins when two staff members edit concurrently.
3. Add draft -> preview -> publish -> rollback instead of making admin edits conceptually equivalent to the live menu.
4. Replace local filesystem media with object storage plus generated AVIF/WebP responsive derivatives and deletion/garbage collection.
5. Add production secrets/configuration, HTTPS deployment, database backups, structured logs, error monitoring and restore drills.
6. Make static/demo admin mode unmistakably a demo and never use it as a production authorization boundary.

## Admin product roadmap — P1

- Overview dashboard: menu completeness score, missing images/translations, inactive products, recent changes and publishing status.
- Products: bulk select/actions, duplicate item, drag/drop ordering with keyboard fallback, scheduled availability, sold-out toggle, variants/add-ons, allergens/dietary tags, price history and per-language editor.
- Categories: drag/drop ordering, visibility schedule, item counts, empty-category warnings.
- Media library: reusable assets, crop/focal point, compression status, alt text and orphan cleanup.
- Restaurant settings: opening hours, temporary closure banner, contact/social links, currency/tax/service settings, branding/theme tokens, SEO/social preview.
- Team: owner/manager/editor/viewer UI, invitations, role changes, session/device management.
- Activity: expose existing audit logs in the UI with actor/action/time filters.
- QR/public links: QR generator, downloadable print presets, slug/domain management.
- Analytics: menu views, product opens, category engagement, language usage and conversion events with privacy-aware collection.
- SaaS: onboarding wizard, plan/quota enforcement, billing hooks and multi-restaurant switcher.

## Customer experience roadmap — P1/P2

- Search with typo tolerance and category filters.
- Dietary/allergen filters with explicit restaurant disclaimer and structured data.
- Product variants/add-ons and optional ordering/contact CTA modules.
- Favorites/recently viewed stored locally.
- Opening/closed state and temporary announcements.
- Better image pipeline with consistent 4:5 crops, responsive srcset and blur placeholders.
- Shareable product URLs and richer SEO: canonical, hreflang, Open Graph and Restaurant/Menu JSON-LD.
- Accessibility pass: screen reader, keyboard-only, contrast and reduced-motion verification in all four languages.

## UI/UX direction

Keep the current premium dark/editorial identity, but reduce legacy CSS layering. Move toward a small token system for spacing, radii, typography, surfaces, borders and semantic states. Admin should optimize for operational speed rather than decorative density: persistent search, clear status chips, bulk actions, contextual empty states, unsaved/publish state and predictable mobile action placement.

## Verification status

Verified here: JavaScript syntax checks, project static audit, 22 backend/unit tests.

Not verified here: PostgreSQL integration, real translation-provider calls, real deployment headers, full browser visual regression, screen readers, physical mobile devices, load testing, object storage/CDN and billing. These must remain release gates before describing the product as production-ready.
