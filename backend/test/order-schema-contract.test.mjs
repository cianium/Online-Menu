import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationPath = path.join(
  root,
  "supabase/migrations/20261019152757_romano_order_core.sql",
);
const sql = fs.readFileSync(migrationPath, "utf8");

const tables = [
  "branches",
  "branch_staff_memberships",
  "restaurant_tables",
  "table_sessions",
  "table_session_tokens",
  "branch_order_counters",
  "orders",
  "order_items",
  "order_events",
  "integration_outbox",
];

test("order core migration keeps browser access fail-closed", () => {
  for (const table of tables) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(
      sql,
      new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`, "i"),
    );
  }
});

test("order core migration enforces tenant and idempotency boundaries", () => {
  assert.match(sql, /foreign key \(restaurant_id, branch_id, order_id\)/i);
  assert.match(sql, /foreign key \(restaurant_id, product_id\)/i);
  assert.match(sql, /unique \(restaurant_id, idempotency_key\)/i);
  assert.match(sql, /table_sessions_one_open_per_table_idx[\s\S]*where status in \('open', 'closing'\)/i);
  assert.match(sql, /foreign key \(restaurant_id, branch_id, table_session_id\)[\s\S]*references public\.table_sessions/i);
  assert.match(sql, /token_hash text not null unique/i);
  assert.match(sql, /request_fingerprint ~ '\^\[a-f0-9\]\{64\}\$'/i);
});

test("order state changes use the restricted optimistic-locking RPC", () => {
  assert.match(sql, /create or replace function public\.romano_transition_order/i);
  assert.match(sql, /security definer\s+set search_path = ''/i);
  assert.match(sql, /v_order\.version <> p_expected_version/i);
  assert.match(sql, /raise exception 'ORDER_VERSION_CONFLICT'/i);
  assert.match(sql, /raise exception 'ILLEGAL_ORDER_TRANSITION'/i);
  assert.match(sql, /perform set_config\('romano\.order_transition', 'allowed', true\)/i);
  assert.match(sql, /perform set_config\('romano\.order_transition', 'denied', true\)/i);
  assert.match(
    sql,
    /revoke all on function public\.romano_transition_order\([\s\S]*from public, anon, authenticated/i,
  );
});

test("money must be configured before QR ordering and is snapshotted", () => {
  assert.match(sql, /not qr_ordering_enabled[\s\S]*currency_code is not null/i);
  assert.match(sql, /menu_price_to_minor_multiplier/i);
  for (const field of [
    "currency_code",
    "currency_exponent",
    "subtotal_minor",
    "discount_minor",
    "tax_minor",
    "service_minor",
    "total_minor",
  ]) {
    assert.match(sql, new RegExp(`${field}[^,]*not null`, "i"));
  }
});

test("order history and async delivery are durable", () => {
  assert.match(sql, /create trigger order_events_immutable/i);
  assert.match(sql, /create trigger orders_reject_delete/i);
  assert.match(sql, /create table public\.integration_outbox/i);
  assert.match(sql, /integration_outbox_pending_idx[\s\S]*where status in \('pending', 'failed'\)/i);
  assert.match(sql, /'order:' \|\| v_order\.id::text \|\| ':status:'/i);
});
