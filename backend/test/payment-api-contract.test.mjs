import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261019175840_romano_commerce_ops.sql"), "utf8");
const hardening = fs.readFileSync(path.join(root, "supabase/migrations/20261020120708_harden_payment_invariants.sql"), "utf8");
const edge = fs.readFileSync(path.join(root, "supabase/functions/romano-payment/index.ts"), "utf8");

test("payment data and RPCs are fail-closed", () => {
  for (const table of ["branch_payment_gateways", "payment_attempts"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`, "i"));
  }
  for (const fn of ["romano_prepare_payment", "romano_attach_payment_authority", "romano_payment_callback_context", "romano_finalize_payment"]) {
    assert.match(sql, new RegExp(`create or replace function public\\.${fn}`, "i"));
    assert.match(sql, new RegExp(`revoke all on function public\\.${fn}[\\s\\S]*from public, anon, authenticated`, "i"));
  }
});

test("payment totals are server sourced and verification is idempotent", () => {
  assert.match(sql, /v_order\.total_minor/i);
  assert.match(sql, /status = 'verified'/i);
  assert.match(sql, /idempotentReplay/i);
  assert.match(sql, /on conflict \(idempotency_key\) do nothing/i);
  assert.match(sql, /perform set_config\('romano\.payment_update', 'denied', true\)/i);
});

test("one active attempt is enforced and paid orders are monotonic", () => {
  assert.match(hardening, /create unique index payment_attempts_one_active_per_order_idx[\s\S]*where status in \('initiated', 'requested', 'requires_review'\)/i);
  assert.match(hardening, /create unique index payment_attempts_one_verified_per_order_idx[\s\S]*where status = 'verified'/i);
  assert.match(hardening, /old\.payment_status = 'paid'[\s\S]*new\.payment_status not in \('paid', 'refunded'\)/i);
  assert.match(hardening, /PAYMENT_STATUS_REGRESSION/);
  assert.match(hardening, /'created', v_created/);
  assert.match(hardening, /romano_fail_payment_start/);
  assert.match(hardening, /payment\.request_ambiguous/);
  assert.match(hardening, /payment\.duplicate_verified/);
});

test("ZarinPal adapter requests and verifies only on the server", () => {
  assert.match(edge, /\/pg\/v4\/payment\/request\.json/);
  assert.match(edge, /\/pg\/v4\/payment\/verify\.json/);
  assert.match(edge, /code === 100 \|\| code === 101/);
  assert.match(edge, /merchant_id: context\.merchantId/);
  assert.match(edge, /amount: context\.amountMinor/);
  assert.match(edge, /requireOrigin\(request\)/);
  assert.match(edge, /context\.created !== true/);
  assert.match(edge, /p_requires_review: true/);
  assert.match(edge, /final\.successful === true/);
  assert.doesNotMatch(edge, /merchantId[^\n]*(?:localStorage|sessionStorage)/i);
});
