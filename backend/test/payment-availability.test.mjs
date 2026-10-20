import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const file=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Guest online payment is offered only when an active non-sandbox merchant exists",()=>{
  const edge=file("supabase/functions/romano-order/index.ts");
  const client=file("js/commerce.js");
  assert.match(edge,/async function onlinePaymentsEnabled\(/);
  assert.match(edge,/provider:"eq\.zarinpal"/);
  assert.match(edge,/active:"eq\.true"/);
  assert.match(edge,/sandbox:"eq\.false"/);
  assert.match(edge,/select:"branch_id"/);
  assert.match(edge,/paymentOnlineEnabled/);
  assert.match(client,/tableSession\?\.paymentOnlineEnabled===true/);
  assert.match(client,/online\.disabled=!enabled/);
  assert.match(client,/renderPaymentMethods\(\)/);
  assert.doesNotMatch(client,/merchant_id|SUPABASE_SERVICE_ROLE_KEY/);
});

test("Guest does not expose unavailable payment selection",()=>{
  const client=file("js/commerce.js");
  assert.match(client,/value="online" disabled/);
  assert.match(client,/if\(!enabled && online\.checked && later\) later\.checked=true/);
});
