# Stage 20 — Commercial demo release candidate (not published)

## Scope and evidence
Runtime baseline `ddaed04c39e2fdc3f8f0e436dbcf9a0c8fbd2069` passed 118 tests, all three browser engines, 25 axe scans with zero definite violations, no structural ARIA findings. Footer contrast minimum 6.2087:1; 23 incomplete contrast rule/scan instances (273 distinct selectors). Native devices, screen readers, complete manual contrast and field CWV/SEO are not certified. No live integration claim. This stage adds only delivery tooling, documentation and read-only QA; no application runtime changes.

## Package
Run `node qa/build-commercial-demo.mjs` on a clean checkout of the exact candidate commit. The resulting directory contains the allowlisted private static export, dependency-free Node loopback launcher, four-language start guide, source commit/tree identity and two checksum manifests. It is sample-only, noindex and cache-safe, not authenticated hosting. Do not publish the package as a public production deployment. CI builds twice and compares manifests, verifies hashes, launches the delivered server, checks both routes, blocked internal paths, host validation and API absence, tests the exact export in Chromium/Firefox/WebKit, and repeats the quality audit. The artifact is a downloadable candidate, not a GitHub Release.

## Release gates and owner actions
1. Preserve all 27 branches. Owner creates a private full mirror/bundle and tests recovery outside the public repository; CI only exercises a local Pages recovery commit, without pushing or uploading history. Main has no active protection; owner must enable PR requirement, no force push/delete, conversation resolution, independent review where available and always-running required CI checks. Path-filtered browser checks must not be made unconditional without an always-reporting gate. External auto-deploy controls must be verified by owner; Vercel candidate/main disabled in source config, but dashboard settings not verified.
2. Review manual contrast, screen reader, real devices and sample-only customer walkthrough; record explicit acceptance of remaining limitations. Check asset/license/branding rights before commercial distribution. Do not import real data.
3. Obtain separate explicit permission for source merge of #25; verify exact head and main, merge commit, full CI. Update #24 against resulting main and rerun showcase and combined checks; separately approve #24. Never merge publication branches into main.
4. Obtain separate explicit approval for publication. Current Pages R5 `3a2dad7fd319f8b69ee5a273d551dec72de49258`. Generate and verify a **public sample-only** static tree with intentionally reviewed indexing/cache policy (not this private package). Record source/tree/manifest, compare publication files, check project subpath, then fast-forward pages-demo with expected-head lease. Verify GitHub Pages deployment and customer/admin URLs. Do not activate Vercel/Supabase or create releases/tags without approval.
5. Rollback: stop publication, record failing SHA; restore known-good Pages tree `ef00732c606bc7e08ac21fbc52292036060189ca` from `3a2dad7fd319f8b69ee5a273d551dec72de49258` as new commit parented by then-current pages-demo (older fallback `939f8beb25a71d9df5743dc47cad2e65d5289d2c` tree `c2f5a86fe6758b3b55f5827c7d7ca33ce69cb1ed`). Check tree and parent, push only after separate rollback authorization with lease; verify both URLs and sample browser storage/cache. Source rollback via revert PR of actual merge commit, not history rewrite. No database migration in standalone release.

Private backup commands for owner (keep secure; do not upload to public Actions):
```sh
git clone --mirror https://github.com/cianium/Online-Menu.git Online-Menu.git
git -C Online-Menu.git bundle create ../Online-Menu-backup.bundle --all
git -C Online-Menu.git bundle verify ../Online-Menu-backup.bundle
git clone --mirror Online-Menu-backup.bundle Online-Menu-restore.git
git -C Online-Menu.git show-ref > original-refs.txt
git -C Online-Menu-restore.git show-ref > restored-refs.txt
diff -u original-refs.txt restored-refs.txt
git -C Online-Menu-restore.git fsck --full
```
Git bundles do not include GitHub settings, secrets, issues or PR metadata; preserve these privately as applicable.
