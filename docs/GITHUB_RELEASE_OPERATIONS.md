# GitHub repository and release operations

## Branch roles

- `main` is the canonical source and default branch. Review and merge source changes only with owner approval.
- `pages-demo` is a **static publication branch**, not a source branch. Do not merge it into `main`.
- `pages-v2-candidate` preserves the tested R5 publication tree. The previous Pages commit `939f8beb25a71d9df5743dc47cad2e65d5289d2c` remains available for rollback. The published R5 commit is `3a2dad7fd319f8b69ee5a273d551dec72de49258`.
- Historical feature branches and release tags are retained until the owner approves archival or cleanup.

Public demo: https://cianium.github.io/Online-Menu/ — admin: https://cianium.github.io/Online-Menu/admin/. GitHub Pages is public; use sample data only. Browser storage is not a secure shared database.

## Independent release gates

The standalone gate comprises `npm run qa`, PostgreSQL and Edge Function contract checks, and both Chromium suites including the isolated export and project subpath. The connected gate requires configured live targets and successful smoke tests. A skipped live check is **not** a pass or production certification. No existing assertion has been weakened.

The old Supabase hostname returned DNS ENOTFOUND and the previous Vercel domain returned HTTP 404. These are unresolved connected-environment outages, not evidence of a broken standalone demo. See R5 Actions runs 45690438939, 45690438342 and 45690438357. The legacy Vercel routing configuration must be reviewed and updated before any connected deployment.

## Configure connected checks only when a real staging/production environment exists

In Settings → Secrets and variables → Actions → Variables, configure these non-secret HTTPS URLs (no credentials, query or fragment):

| Variable | Meaning |
| --- | --- |
| `ROMANO_SITE_URL` | Connected website origin, no path |
| `ROMANO_PUBLIC_API_URL` | Public Edge Function base |
| `ROMANO_ADMIN_TEST_URL` | Admin Edge Function base |
| `ROMANO_FUNCTIONS_BASE_URL` | Edge Functions base, before individual function names |
| `ROMANO_LIVE_QA` | Set to `true` only to enable automatic connected smoke checks on relevant changes |

Manual `workflow_dispatch` always attempts the selected live check and fails if required variables are missing. Direct and proxy auth checks retain negative authorization/CSRF assertions. Run against an authorized test environment, not an unrelated public site. These variables do not reconfigure the deployed backend or Vercel rewrites.

## Release hygiene and rollback

Protect `main` with PR review, required CI and browser checks, and no force-push or deletion. Configure a separate connected deployment gate when needed. Preserve historical releases/tags and issue #10 until their metadata is verified by a maintainer. Do not automatically publish a new release or migrate customer data as part of a PR merge.

To roll back Pages without rewriting history, create a new commit with the previous static tree and current `pages-demo` as parent, then fast-forward the publication branch after owner approval. Verify Pages Actions and both public URLs. A code rollback does not necessarily restore browser storage; export sample data first.
