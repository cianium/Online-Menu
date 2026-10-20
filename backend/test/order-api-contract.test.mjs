import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  isSessionToken,
  normalizeOrderRequest,
  randomSessionToken,
  sha256Hex,
  signQrToken,
  verifyQrToken,
} from "../../supabase/functions/romano-order/core.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20261019160240_romano_order_create.sql"),
  "utf8",
);
const edge = fs.readFileSync(
  path.join(root, "supabase/functions/romano-order/index.ts"),
  "utf8",
);

const branchId = "4c43d4c8-39fd-4b29-aef5-67a211482f95";
const tableId = "652b17b5-78b1-4dd4-8a5c-595df9d45f3c";
const secret = "test-only-signing-secret-with-at-least-32-characters";

test("QR tokens are signed, verified, and tamper evident", async () => {
  const token = await signQrToken({ branchId, tableId, qrVersion: 7 }, secret);
  assert.deepEqual(await verifyQrToken(token, secret), { branchId, tableId, qrVersion: 7 });
  await assert.rejects(() => verifyQrToken(token.replace(".7.", ".8."), secret), /INVALID_QR_TOKEN/);
});

test("session tokens have 256 bits of browser-safe entropy", async () => {
  const first = randomSessionToken();
  const second = randomSessionToken();
  assert.equal(isSessionToken(first), true);
  assert.equal(first.length, 43);
  assert.notEqual(first, second);
  assert.match(await sha256Hex(first), /^[a-f0-9]{64}$/);
});

test("order input is canonicalized before fingerprinting", () => {
  const normalized = normalizeOrderRequest({
    language: "fa",
    idempotencyKey: "client-order-000001",
    notes: "  less salt  ",
    items: [{ productId: "fresh-orange", quantity: 2, notes: "  cold  " }],
  });
  assert.deepEqual(normalized.items, [{
    productId: "fresh-orange",
    quantity: 2,
    notes: "cold",
    modifiers: [],
  }]);
  assert.equal(normalized.notes, "less salt");
  assert.throws(() => normalizeOrderRequest({
    language: "fa",
    idempotencyKey: "client-order-000002",
    items: [
      { productId: "fresh-orange", quantity: 1 },
      { productId: "fresh-orange", quantity: 1 },
    ],
  }), /DUPLICATE_ORDER_ITEM/);
});

test("atomic order RPCs are service-only and server-price catalog items", () => {
  for (const name of ["romano_open_table_session", "romano_create_qr_order", "romano_get_qr_order"]) {
    assert.match(migration, new RegExp(`create or replace function public\\.${name}`, "i"));
    assert.match(migration, new RegExp(`revoke all on function public\\.${name}[\\s\\S]*from public, anon, authenticated`, "i"));
  }
  assert.match(migration, /pg_advisory_xact_lock/i);
  assert.match(migration, /v_product\.price \* v_branch\.menu_price_to_minor_multiplier/i);
  assert.match(migration, /p\.active/i);
  assert.match(migration, /c\.active/i);
  assert.match(migration, /'order\.submitted'/i);
  assert.match(migration, /idempotentReplay/i);
});

test("public order edge API uses signed QR, HttpOnly cookies, and origin checks", () => {
  assert.match(edge, /verifyQrToken/);
  assert.match(edge, /requireAllowedOrigin\(request\)/);
  assert.match(edge, /HttpOnly; Secure; SameSite=Lax/);
  assert.match(edge, /MAX_BODY_BYTES = 32768/);
  assert.doesNotMatch(edge, /SUPABASE_SERVICE_ROLE_KEY[^\n]*(?:return|json|Response)/i);
});
