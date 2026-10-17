# ROMANO — Complete Version Audit

## Executive conclusion

**Canonical baseline: `ROMANO_Rv4_6_COMPLETE_TRANSLATED`.**

It is the most complete runtime branch among the five supplied packages because it keeps the Rv4.6 merged implementation and adds the four-language customer/admin presentation layer. `Final Restaurant Menu` is runtime-equivalent across the 45 common application files, but lacks the three release documentation files. The package in this directory is a corrected engineering derivative of the canonical baseline.

## Version-by-version result

### Rv4.5 ADMIN FULL UX
Strong early admin workspace and the older PWA bundle. It is behind Rv4.6 in the core integration branch.

### Rv4.5.1 DEBUGGED
Adds incremental hardening over Rv4.5, but the product surface is still based on the earlier architecture.

### Rv4.6 COMPLETE MERGED
Major integration point. It substantially reduces/reorganizes the admin extension CSS and updates the customer/admin runtime. It does not contain the completed admin four-language presentation layer.

### Rv4.6 COMPLETE TRANSLATED
Best source baseline: Rv4.6 merged runtime + customer localization + admin localization + release QA/design documentation.

### Final Restaurant Menu
No changed common runtime files compared with Rv4.6 COMPLETE TRANSLATED. The practical difference is packaging/documentation, not application behavior.

## Critical bugs found and fixed

1. Restaurant Settings `Save` referenced an `instagram` variable outside its scope. This caused a runtime `ReferenceError` and prevented settings from being saved.
2. Instagram URL validation had accidentally been inserted into the Product form handler, even though the Product form has no Instagram field.
3. The admin defined its own `Storage` object name, colliding conceptually with the browser `Storage` type and creating TypeScript/checking noise. It is now `RomanoStorage`.
4. Admin prices were always rendered with the Persian locale. They now follow the active admin language.
5. The admin i18n dictionary contained duplicate keys. Duplicates were removed and the translation API is now explicitly exported.
6. Legacy admin alerts/confirms/toasts were not translated by the DOM MutationObserver because they are not DOM content. The prepared build routes them through the admin i18n layer.
7. A saved/removed phone or Instagram link could retain a stale `href` on the customer menu. Links are now cleared before new values are applied.
8. Imported backup data could contain unsafe external URLs. Backup validation and customer-side URL sanitization now restrict navigation to HTTP(S), while image inputs are constrained to safe data/image or HTTP(S) sources.
9. Backup validation accepted schema-less payloads. The import path now requires `romano.menu-backup` schema and version 1, plus size/field/reference bounds.
10. Product IDs were timestamp-only. IDs now include entropy to reduce same-millisecond collisions.
11. Product sorting called “current order” could not represent recent edits. Products now carry `createdAt`/`updatedAt` and that sort mode uses the timestamp when available.
12. Image upload now rejects files above 12 MB before decoding.

## Design findings

### Customer menu
- The visual language is coherent and premium-looking: dark editorial palette, serif display typography, large food imagery and focused product modals.
- Responsive/mobile treatment is strong, with dedicated breakpoints, safe viewport handling and a horizontal product interaction model.
- Accessibility features already present include keyboard activation for category cards, modal focus trapping, `aria-modal`, scroll locking and reduced-motion handling.
- The biggest visual quality problem is the asset set, not the layout: product images use several aspect ratios, so the same card geometry can produce inconsistent cropping.
- Demo imagery is mostly 448–736 px wide; this is below a serious production image target. Several files are also above the old 180 KB target.
- The logo is high resolution but heavy (~574 KB) and should be delivered in optimized derivatives.

### Admin panel
- Strong information hierarchy, responsive sidebar, CRUD modals, search/filter/sort, backup/restore and command palette are already present.
- The primary UI debt is the split between base CSS and extension CSS plus legacy Rv4.3/Rv4.5 naming. This is maintainability debt rather than a fundamental UX flaw.
- Native browser confirmations still break the visual system. They are localized in this build, but a later pass should replace them with the existing visual modal/dialog pattern.
- Category/product ordering should ultimately support drag-and-drop with a keyboard-accessible fallback.
- Permission-aware navigation becomes necessary once server RBAC is connected.

## Production blockers intentionally left visible

These are **not** marked complete because doing so would be misleading:

- Client-side localStorage is still the admin access boundary in the static build.
- Google Client ID is still a placeholder.
- There is no server-side authentication/RBAC service in the package.
- Menu data is still stored in localStorage rather than a tenant-isolated database.
- Administrator-entered content is still single-language fields; only the UI and seed content have four-language presentation support.
- Images are still demo assets and have no production object-storage/derivative pipeline.
- Full browser visual/E2E execution was not available in this environment.

## Engineering handoff

The prepared package adds:
- `backend/README.md`
- `backend/schema.sql`
- `docs/API_CONTRACT.md`
- `docs/I18N_CONTENT_MODEL.md`
- `docs/DESIGN_REVIEW.md`
- `docs/LAUNCH_CHECKLIST.md`
- `docs/ARCHITECTURE.md`
- `qa/static-audit.mjs`
- `package.json`
- versioned `manifest.webmanifest` and `sw.js`

This is the correct point to start the backend/productization phase without throwing away the customer/admin UI.
