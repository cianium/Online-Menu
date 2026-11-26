# Stage 19 follow-up — accessibility and performance evidence

Baseline: `2e2886125e4c9c0e3fc8da8aa78149a6b927876a`. No runtime dependencies, backend, payment, release, or deploy changes.

## Repair
Without JavaScript the customer splash never dismissed and the inert admin had no actionable explanation. Both now expose a CSP-compatible no-script notice in all four locales. The special stylesheet is loaded only with JavaScript disabled, is included in static export and cached with the shell. No connected-mode or existing indexing policy changes.

## Repeatable audit
`Standalone quality audit` installs axe-core only on the CI runner, exports the private standalone bundle and audits a loopback Pages-style subpath. All external requests are blocked. It records 16 customer/dashboard locale/viewport combinations and 5 additional English mobile admin views; screenshots and machine-readable findings are saved even if serious/critical issues fail the job. Incomplete/manual-review findings and lower-severity findings remain visible. It separately checks both no-script notices and observes LCP and initial CLS in cold Chromium mobile emulation (150 ms latency, 1.6 Mbit/s download, 0.75 Mbit/s upload, 4x CPU slowdown). These lab observations do not measure field p75 or INP and are not Lighthouse scores. No universal performance threshold is inferred from one run.

Run locally with Playwright and axe-core 4.10.3 installed, an isolated static export at `http://127.0.0.1:8767/Online-Menu/`, and `node qa/quality-audit.cjs`. Output: `quality-report/report.json` and screenshots. No deployment.

## Release boundaries
Review results at the new commit, then fix actual findings. Do not interpret a green automated audit as WCAG certification or full manual visual review. Native Safari/iOS, real device and screen reader testing, field Core Web Vitals, real crawler/social preview and live infrastructure remain separate.
