# RC1 acceptance — candidate repair, not released

RC1 source `1b31055e17e860cb71245132bb7e211b0ac48487` and original ZIP remain immutable. Existing Stage 20 evidence: 118/118 tests, 24 integration checks, 25 axe scans, 76 public and 80 delivery hashes. Independently rechecked both hash manifests from extracted ZIP and loopback server HTTP isolation/header contract (GET/HEAD, traversal, invalid Host, unsupported POST, metadata/API denial). Full Git mirror unavailable due local DNS; GitHub main protection endpoint 403, zero rulesets and all 27 branches unprotected. No source or publication merges, deploys or deletions.

## Verified source defect and repair
Backup restore was a non-focusable label around a hidden file input. Replace with native button opening the same picker, restore focus after import/cancel/error and add missing four-language labels. No backup schema, storage engine or authentication changes. Existing RC1 bytes remain downloadable; repaired source is a new candidate, not RC1 overwritten. Cache revision updated.

## Added acceptance gate
Test the exact delivered ZIP directory: four translated backup controls, keyboard focus and native chooser, cancel, actual JSON export and valid restore, duplicate and unsafe image rejection without mutation, original restore and reload in both surfaces; forced-colors reflow and skip-link checks in four locales at 320px. Artifact retains screenshots and JSON. Browser tests run on CI; local Chromium navigation was blocked by its administrative policy. No real data.

## Unresolved release gates
23 color-contrast incomplete rule/scan combinations (273 unique selectors in RC1); detailed register retained. No claim of full contrast adjudication, screen reader/native device, field CWV/SEO or connected service security. Full private repository mirror, branch protection, deployment settings and commercial asset/brand rights require owner verification. Local rollback rehearsal passed; no live rollback performed. Only sample-only candidate may be reviewed. Final publication requires separate explicit authorization.
