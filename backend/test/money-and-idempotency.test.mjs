import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const moneySource = fs.readFileSync(path.join(root, "js/money.js"), "utf8");
const commerceSource = fs.readFileSync(path.join(root, "js/commerce.js"), "utf8");

function moneyApi() {
  const sandbox = { window:{} };
  vm.runInNewContext(moneySource, sandbox, { filename:"money.js" });
  return sandbox.window.OnlineMenuMoney;
}

test("Iranian catalog and canonical order amounts display in Toman exactly once", () => {
  const money = moneyApi();
  assert.match(money.formatCatalog(150_000, { currency:"IRR", language:"fa" }), /۱۵۰.?۰۰۰ تومان/);
  assert.match(money.formatMinor(1_500_000, { currency:"IRR", exponent:0, language:"fa" }), /۱۵۰.?۰۰۰ تومان/);
  assert.match(money.formatMinor(12_345, { currency:"USD", exponent:2, language:"en" }), /123\.45/);
});

test("commerce persists idempotency keys across identical retries", () => {
  assert.match(commerceSource, /function persistentIdempotency\(/);
  assert.match(commerceSource, /existing\?\.fingerprint === fingerprint/);
  assert.match(commerceSource, /persistentIdempotency\(orderRequestKey\(\), "order", fingerprint\)/);
  assert.match(commerceSource, /persistentIdempotency\(storageKey, "payment", orderId\)/);
  assert.doesNotMatch(commerceSource, /idempotencyKey:\s*idempotency\(/);
});
