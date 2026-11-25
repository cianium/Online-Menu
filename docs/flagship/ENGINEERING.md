# RAMEN / Engineering brief

The frontend is shared across runtime modes, but the trust boundaries and capabilities differ. This is a source architecture overview, not a production security attestation.

## System context

```mermaid
flowchart TB
  Guest["Guest browser"] --> UI["Customer HTML / CSS / JS"]
  Staff["Restaurant team"] --> Admin["Admin HTML / CSS / JS"]
  UI --> Mode{"Runtime mode"}
  Admin --> Mode
  Mode -->|"Standalone"| Demo["Bundled sample catalog"]
  Demo <--> Local["Browser localStorage"]
  Mode -->|"Local API"| Fastify["Fastify / Node"]
  Fastify --> PG["Local PostgreSQL"]
  Mode -->|"Hosted API"| Router["Vercel /api/v1 routing"]
  Router --> Edge["Supabase Edge Functions"]
  Edge --> DB["PostgreSQL + RLS / RPC"]
  Edge --> PSP["ZarinPal payment adapter"]
```

### Runtime boundaries

| Concern | Standalone | Local connected API | Hosted connected |
| --- | --- | --- | --- |
| Data | Sample catalog / localStorage | PostgreSQL | Supabase PostgreSQL |
| Identity | Not real authentication | Server sessions and membership | Hosted authorization contracts |
| Orders/payment | No real fulfillment or payment | Do not assume hosted commerce parity | Commerce source and branch flags |
| Delivery | Loopback server or private static export | Fastify HTTP server | Configured Vercel/Edge routes |

The browser may request optional fonts; fallback styles keep the demo usable. The private static export is not a production API server.

## Connected order and payment sequence

```mermaid
sequenceDiagram
  participant G as Guest
  participant O as Order API
  participant D as Database
  participant K as Kitchen / Admin
  participant P as Payment API / PSP
  G->>O: Signed table QR / session
  O->>D: Validate table and branch
  G->>O: Order intent + idempotency key
  O->>D: Resolve price and write order atomically
  O-->>G: Order reference
  K->>O: Authorized status transition
  O->>D: Version check + event
  opt Enabled and configured payment
    G->>P: Start payment for order
    P->>D: Read server amount / payment attempt
    P->>P: Provider request and verification
    P->>D: Apply guarded result
  end
  G->>O: Retrieve authorized order status
```

Conceptual sequence only; exact endpoints and valid state transitions are defined by source and [API contract](../API_CONTRACT.md). The kitchen and payment timelines are independent and branch configuration governs availability.

## Risk controls and release evidence

| Risk | Source control or acceptance requirement |
| --- | --- |
| Cross-tenant data exposure | Server membership checks and RLS; staging isolation test |
| Modified browser prices | Server-authoritative amount and currency mapping |
| Duplicate requests | Idempotency, guarded attempts, concurrency checks |
| Ambiguous payment | Reconciliation rather than blind retry |
| Exposed secrets | Server-only configuration; scan public assets and exported bundle |
| Stale deployment | Record revision, smoke test, rollback plan |
| Data loss | Backup/restore rehearsal before migration |

Run `npm run qa`, `npm run qa:db`, and browser suites with Playwright as documented in the root README. The database fixture does not replace a real catalog schema baseline. The demo browser suite does not prove live payment, real tenant isolation or PWA offline-cache behavior.

## Go/no-go gates

- **Demo:** no production credentials; localhost preview works; protected export checksum matches; fresh browser context, four languages and widths verified.
- **Private VPS:** approved installation, TLS, access control, restricted web root, API 404 checks and rollback; do not rely on robots/noindex for security.
- **Connected pilot:** migration baseline reviewed, backup/restore rehearsed, branch currency and tables configured, signed QR validated, tenant isolation verified, PSP sandbox callbacks tested.
- **Public launch:** explicit owner approval, current deployment verification, monitoring, operational support, incident and rollback ownership.

[Architecture source notes](../ARCHITECTURE.md) · [Local backend](../../backend/README.md) · [VPS guide](../VPS_DEMO_FA.md) · [Deployment guide](../DEPLOY_VQ3_FA.md) · [Security policy](../../SECURITY.md)
