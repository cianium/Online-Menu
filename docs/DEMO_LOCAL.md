# Local standalone demo

## Start

Use Node.js 22 (the project's CI version). From the repository root:

```sh
npm run demo
```

- Customer menu: http://127.0.0.1:8765/
- Admin panel: http://127.0.0.1:8765/admin/

The default port is 8765; set `DEMO_PORT` to another port if required. Stop with Ctrl+C.
No npm dependency installation, database, service credentials, or API proxy is required for this static preview.

The server deliberately returns 404 for API routes, so the existing frontend's local demo paths can be exercised. An explicit customer restaurant slug must still follow the frontend's normal fail-closed behavior. The demo is not a substitute for production authentication, tenant isolation, live orders, payments, or database integration. Demo data is browser-local; use a dedicated browser profile for predictable QA. Google Fonts may be requested by existing pages; the server itself does not fetch them. Offline typography uses the CSS fallbacks unless fonts are already cached.

This launcher is for local development and demonstration only. It binds to IPv4 loopback, limits the allowed host, serves only public paths, and does not proxy or expose backend files. Do not use it as a production HTTP server.

## Verify

```sh
npm run qa:demo
npm run qa
```

With Playwright/Chromium installed and the demo server running on port 8765, the existing `npm run qa:customer` and `npm run qa:browser` suites can be run separately. Follow their browser dependency instructions. HTTP smoke tests are not equivalent to browser UI tests; a live service test requires a separately authorized staging environment.

## Offline-dependency and integration browser test

With Playwright installed and its Chromium available, run `npm run qa:demo-browser` against the same local server. This test blocks every non-local network request, checks both applications and all four locales at 320/768/1440 px, creates a local product through the admin UI, verifies customer synchronization and reload persistence, and checks that an unknown explicit restaurant does not show the demo catalog. Service workers are blocked for this particular test; it is not a PWA offline-cache test. The customer browser workflow runs this separately from its mocked API regression suite. The admin and customer browser workflows both use the local demo server. Real QR order submission and payment require a backend and are not simulated as successful.

## Release safety

Automatic Vercel Git deployments for `main` and `ux/system-redesign-vq3` are temporarily disabled through `vercel.json` while the final demo integration is reviewed. This does not change API rewrites, the existing deployed site, or database configuration. Verify the actual Vercel project's deployment status and any other deploy hooks independently. Re-enable the relevant branch only after explicit release approval.
