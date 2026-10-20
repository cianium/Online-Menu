# ROMANO order core

Status: **implemented and locally verified; not applied to Production**.

The ordering backend is split into two migrations:

- `migrations/20261019152757_romano_order_core.sql`: durable order/session data.
- `migrations/20261019160240_romano_order_create.sql`: atomic QR-session,
  order-create and customer status RPCs.

They add the contract shared by QR ordering, ROMANO POS, waiter entry and the
kitchen display.

## Core model

- `branches`: operational settings per branch. QR ordering stays disabled until
  currency, exponent and the catalog-price-to-minor-unit multiplier are all
  configured explicitly.
- `restaurant_tables`: stable table identity plus a revocable `qr_version` for
  signed QR payloads.
- `table_sessions`: the shared visit at a physical table. A partial unique
  index permits only one open/closing session per table.
- `table_session_tokens`: independently hashed and expiring browser access
  tokens, so multiple diners can safely join one table session.
- `orders` and `order_items`: immutable tenant, channel and money snapshots.
  The idempotency key is unique per restaurant and paired with a request hash.
- `order_events`: append-only state history.
- `integration_outbox`: durable work for SMS, print and external POS adapters.
- `branch_staff_memberships`: branch-scoped operational roles without widening
  access to the existing Admin CMS.

Order lifecycle and payment lifecycle remain separate. The vq.3 commerce
migration adds `payment_attempts`, a dedicated payment state, and server-side
PSP callbacks without overloading the operational order `status`.

## State machine

`submitted → accepted → preparing → ready → served|delivered → completed`

`rejected` and `cancelled` are terminal alternatives. Status changes must call
`romano_transition_order` with the expected order version. The function locks
the row, checks the legal transition and staff role, appends an event and writes
an idempotent outbox message in the same transaction.

All ordering RPCs are executable by `service_role` only. Browser roles have no
table or RPC privileges; customer and staff requests must be validated by an
Edge Function.

## Public QR order flow

The `romano-order` Edge Function exposes these same-origin routes through
Vercel:

- `POST /api/v1/orders/session`: verifies an HMAC-SHA-256 QR payload containing
  branch, table and revocable QR version, then sets a 256-bit `HttpOnly`,
  `Secure`, `SameSite=Lax` access cookie.
- `POST /api/v1/orders/submit`: validates/canonicalizes a maximum of 50 items,
  hashes the request for idempotency and calls `romano_create_qr_order`.
- `GET /api/v1/orders/:orderId`: returns only an order belonging to the caller's
  live table session, including its public event timeline.

Catalog IDs, availability, translations and prices are resolved again inside
Postgres. Client-supplied prices and non-empty modifiers are rejected/ignored by
design; modifier catalogs require a later schema rather than trusting a browser
total. Equal idempotency keys are serialized with a transaction-scoped advisory
lock and backed by a unique constraint.

Required deployment secret: `ROMANO_QR_SIGNING_SECRET` (at least 32 random
characters). `ROMANO_PUBLIC_ORIGINS` may override the comma-separated browser
origin allowlist. The function configuration intentionally disables the
platform JWT gate because customers authenticate with the signed QR plus the
opaque table-session cookie; authorization remains inside the handler and RPCs.

## Verification

- Fast contract checks: `npm test`
- Database behavior: apply the backend baseline and both order migrations to a
  disposable PostgreSQL 17 database, then run `qa/sql/order-core-smoke.sql` and
  `qa/sql/order-create-smoke.sql` with `ON_ERROR_STOP=1`.

The smoke suite covers RLS/revokes, explicit money configuration, one active
session per table, independent multi-diner tokens, stale QR rejection,
server-side pricing, idempotent replay/conflict behavior, optimistic locking,
legal and illegal status changes, ownership checks, auto-accept, immutable
totals/items, event history and the outbox.

## Production rollout gate

Before applying the migration:

1. Reconcile the incomplete historical migration files with the live project.
2. Decide the existing menu price unit. If catalog prices are Toman while the
   canonical currency is IRR, configure multiplier `10` and exponent `0`.
3. Configure the QR signing secret and an edge/WAF rate limit; the handler
   already enforces origin and 32 KiB body limits.
4. Run database advisors, both smoke suites, concurrency/load tests and a
   rollback rehearsal on staging.
5. Seed the first branch/tables only after the owner confirms their real setup.
6. Generate signed QR assets with the final table IDs and verify the connected
   customer cart/status UI against staging.

Realtime publication is not enabled by this migration. KDS/POS subscriptions
will be added only with their tenant authorization and reconnect behavior tested.
