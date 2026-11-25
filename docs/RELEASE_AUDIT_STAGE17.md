# Stage 17 — Final Release Audit

Scope: independent public sample-only demo, not a connected production service. Baseline source `0f11a70481a97fbc643bd4d870e44e2ac85444f2`; main `78efd05d1e831cbfee51767c1eefc9164ec8ba24`; docs PR #24 head `1910e0a4e1dfe8156a0505e9949e9b20fa136256`; published static R5 `3a2dad7fd319f8b69ee5a273d551dec72de49258`.

## Verified baseline evidence

- [CI](https://github.com/cianium/Online-Menu/actions/runs/45696966640): 91 backend tests and 20 demo/API/export tests, all passed; syntax/static audit, PostgreSQL 17 contract and Edge Function type-check passed.
- [Customer QA](https://github.com/cianium/Online-Menu/actions/runs/45696966600): 34 regression checks and seven integration checks each on source, exported root and project subpath (55 PASS messages). The integration blocks external network requests and verifies customer/admin startup, four locales, cross-tab persistence, stale writes, cart invalidation, moderation and fail-closed tenant lookup.
- [Admin QA](https://github.com/cianium/Online-Menu/actions/runs/45696966616): 27 PASS messages, including 120 locale/viewport/page combinations. Connected API interactions are mocked.
- [Admin security](https://github.com/cianium/Online-Menu/actions/runs/45696966658): type-check passed; live security step skipped. Four other connected workflows skipped.
- [Docs CI](https://github.com/cianium/Online-Menu/actions/runs/45697168155) and [showcase](https://github.com/cianium/Online-Menu/actions/runs/45697168318) succeeded at the stated docs head.
- [Pages publication](https://github.com/cianium/Online-Menu/actions/runs/45696554167) succeeded previously; this is not a new deployment or a live availability check.

Both PRs were ahead of main (6 and 20 commits respectively), with zero commits behind and no overlapping changed paths at the audited heads. Recheck against current main before merge. Existing historical branches/tags are retained.

## Changes in this audit

- Add Firefox/WebKit integration jobs alongside unchanged Chromium coverage; preserve the no-external-network and project-subpath assertions.
- Parameterize the integration runner by a strict engine allowlist. Default remains Chromium; custom Chromium executable is not passed to other engines.
- Record exact baseline evidence and distinguish workflow success from skipped live steps.

New commit results must be checked separately; this document does not certify the new matrix before it runs.

## Performance and limitations

Chromium loopback integration observations across three baseline runs: customer DOMContentLoaded 198–209 ms, load 206–217 ms, 28 local resources, 1,533,714–1,534,174 encoded bytes; admin 129–144 ms, load 135–151 ms, 22 local resources, 592,359–592,819 encoded bytes. These are controlled lab observations, not Core Web Vitals, mobile network measurements or production SLA.

## Release decisions

| Gate | Status at baseline |
| --- | --- |
| Standalone Chromium, syntax, static, contract | Pass |
| Firefox/WebKit integration | Newly added; results required |
| Native Safari/iOS, real mobile devices, accessibility manual review | Not verified |
| Core Web Vitals and performance budgets | Not verified |
| Live backend, payments, SMS, real multi-device customer data | Blocked/not tested; not required for sample-only demo |
| Branch protection and historical release cleanup | Owner decision required |
| Source merge, release tagging, Pages/Vercel publication | Explicit owner approval required |

Recommended sequence: verify new CI, review visual/manual accessibility and real-device smoke, recheck both PR heads and file overlap, then request separate approval to merge. Do not merge static publication branches into main. No new connected configuration or customer data migration belongs in this audit.
