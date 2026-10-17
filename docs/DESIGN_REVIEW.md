# ROMANO Design Review

## Customer menu
The visual direction is coherent: dark editorial restaurant styling, large imagery, restrained typography, horizontal product shelves and focused modal detail. The interaction layer includes keyboard-accessible category cards, modal focus handling, scroll locking and responsive breakpoints.

### Design issues to address before commercial launch
- **Image consistency:** seed product images use several aspect ratios (roughly 0.55–0.82) instead of a single product-card ratio; this can create inconsistent crops and visual rhythm.
- **Asset resolution:** the current product/category assets are mostly 448–736 px wide, below a 1200 px production target. Replace them rather than upscaling them.
- **Asset weight:** several demo assets exceed 180 KB and the logo is about 574 KB. Generate responsive WebP/AVIF derivatives.
- **Content quality:** placeholder restaurant details and demo food imagery should be separated from the reusable product shell. Commercial builds need per-restaurant content and branding.
- **CSS layering:** `style.css` + `romano.css` and `admin.css` + `rv4-admin-plus.css` work, but contain legacy/extension layers. A later design-system cleanup should consolidate tokens and component ownership.

## Admin panel
The admin workspace has a strong operational hierarchy, filtering/sorting, modal CRUD, backup/restore, command palette, mobile sidebar and save-state feedback.

### Remaining UX work
- Replace browser-native confirmation dialogs with the existing visual dialog system for a completely consistent UI.
- Add explicit unsaved state to every editable settings section, not just restaurant settings.
- Add drag-and-drop ordering with keyboard fallback for categories/products.
- Add empty/error/loading states for future API-backed screens.
- Add permission-aware UI once server RBAC exists.
