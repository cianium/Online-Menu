# R16.1 — Standalone branch directory foundation

Base: R15 candidate `db73614c8e86dd99efbcd2f09c3e4350ef8f4e8e`. Keep this work separate until R15 acceptance is complete.

## Implemented

- Pure, versioned directory model in `js/demo-branches.js`: create, rename, deactivate/reactivate, stable IDs, protected active primary branch, bounded records, normalized names, duplicate detection and revision checks. No irreversible delete.
- Domain errors are machine-readable codes, not user-facing text; translate them in FA, AR, EN and TR when wiring the UI.
- Regression cases in `backend/test/demo-branches.test.mjs` participate in the existing `npm test` glob.

## Explicit boundaries

This increment is not wired into the admin or customer runtime. It does not write localStorage, perform authentication, scope orders/catalog/revenue, generate branch QR codes, or modify any connected API. Revision comparison is only a pure model precondition; it does not make browser storage atomic. Names are normalized using NFKC and locale-independent lowercasing, not a guarantee of locale-specific collation equivalence. No migration or change to existing data occurs.

## Next acceptance increment

1. Add a transactional browser-local persistence adapter, with safe schema/version handling and failure feedback. Verify concurrent writes, reload and corrupted storage; no silent resets.
2. Add authenticated-demo-only branch administration in the existing admin design, with four-language controls, mobile and keyboard QA; don't expose it in connected mode.
3. Preserve existing single-branch data via an explicit default-branch migration. Define and verify branch scoping for products, QR/table operations, orders, member history and revenue; backups must include every scoped entity. Avoid presenting sample QR codes as signed production tokens.
4. Test the exact standalone export with Chromium, Firefox and WebKit, including two branches, cross-tab writes, QR routing and negative cross-branch cases; independently validate connected staging and manual accessibility/real-device acceptance. Only release with owner approval.

## Verification

Run `node --test backend/test/demo-branches.test.mjs`, `npm run qa`, and `npm run qa:syntax` on the checked-out source. This document does not assert that those commands have run.
