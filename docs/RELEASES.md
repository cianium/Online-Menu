# RAMEN — GitHub release metadata audit

**RAMEN (رامن)** is the current product brand, **Online-Menu** is the repository, and the source package currently reports **4.9.1**. Existing GitHub Release tags are historical snapshots, not proof of production deployment.

## Existing releases (keep tags and artifacts)

| Tag | Published (UTC) | Current classification | Issue |
| --- | --- | --- | --- |
| `v1.0` | 2026-10-18 02:03 | Historical release | Notes describe the older project and do not correspond to the 4.9.1 package |
| `v1.2` | 2026-10-18 02:05 | Historical release | Linked ZIP filename includes `5.0`; archive contents need verification |
| `v1` | 2026-10-18 02:10 | Historical pre-release | Release notes reference a compare URL in the former `cianium/Romano` repository |

Do **not** delete these tags, rewrite their target commits or relabel unverified ZIPs as verified releases.

## Recommended edits on GitHub Release pages

The connected GitHub tools can edit source files and pull requests but **cannot update Release titles or bodies directly**. Open [GitHub Releases](https://github.com/cianium/Online-Menu/releases) and edit these after reviewing the original notes:

### `v1.0`

**Title:** `Online-Menu v1.0 — Historical development snapshot`

**Add above the existing notes:**

> Historical source snapshot from the former ROMANO project, now branded RAMEN. It is not the current 4.9.1 source baseline and does not certify a production deployment.

### `v1.2`

**Title:** `Online-Menu v1.2 — Historical source snapshot`

**Description:**

> Historical repository release. The linked ZIP filename refers to 5.0, but the archive contents and exact version must be checked independently. RAMEN is the current product brand. This release does not certify production readiness.

Preserve the original attachment link for historical reference unless it is independently confirmed invalid.

### `v1` (pre-release)

**Title:** `Online-Menu v1 — Historical pre-release`

**Description:**

> Historical pre-release from the ROMANO-to-RAMEN transition. Older comparison links refer to the former repository name and should not be considered current source documentation. This is not a production release.

Keep the pre-release flag on this historical record.

## Release process going forward

1. Freeze a commit and align `package.json` version, tag, title and changelog.
2. Run unit/static tests, browser QA and any relevant real backend and security integration tests.
3. Publish a new SemVer tag only after verification (e.g. `v4.9.2` **if and when** that version is actually prepared and tested).
4. Mark incomplete builds **pre-release** and disclose migrations, limits and rollback.
5. Preserve existing tags and historical notes; do not force-move tags.
6. Keep technical legacy identifiers (`romano_*`, Supabase function paths, storage keys and cookies) until a controlled compatibility migration.

## Scope of the branding update

The RAMEN UI change updates presentation, admin text, PWA metadata and documentation. It does not rename tenant fixtures, replace image assets, change API routes, migrate database data, revise existing release objects or verify a live production deployment.
