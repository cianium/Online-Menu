import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("QR admin print renders entirely in the browser without external QR APIs",()=>{
  const html=read("admin/index.html");
  const js=read("admin/orders.js");
  const lib=read("admin/vendor/qrcode.min.js");
  const css=read("admin/orders.css");
  assert.match(html,/vendor\/qrcode\.min\.js/);
  assert.ok(html.indexOf("vendor/qrcode.min.js")<html.indexOf('src="orders.js"'));
  assert.match(lib,/QRCode/);
  assert.match(read("admin/vendor/QRCODE_LICENSE.txt"),/MIT License/);
  assert.match(js,/new window\.QRCode\(qr,/);
  assert.match(js,/window\.print\(\)/);
  assert.match(css,/@media print/);
  assert.ok(!js.includes("chart.googleapis.com"));
});

test("QR table actions require manager permissions and server-side ownership checks",()=>{
  const edge=read("supabase/functions/romano-admin/index.ts");
  const sql=read("supabase/migrations/20261020210500_romano_table_lifecycle.sql");
  assert.match(edge,/const tableActionMatch=/);
  assert.match(edge,/resolveMember\(p,undefined,"manager"\)/);
  assert.match(edge,/service\.rpc\("romano_configure_table"/);
  assert.match(edge,/p_restaurant:m\.restaurant_id/);
  assert.match(sql,/for update;/);
  assert.match(sql,/p_rotate then qr_version \+ 1/);
  assert.match(sql,/revoked_at=now\(\)/);
  assert.match(sql,/grant execute on function public\.romano_configure_table/);
  assert.match(sql,/to service_role;/);
});

test("QR table management has localized controls and no inline secrets",()=>{
  const js=read("admin/orders.js");
  const i18n=read("admin/admin-i18n.js");
  for(const key of ["چاپ QR","غیرفعال‌کردن میز","باطل‌کردن QR قبلی","لینک سفارش میز"]){
    assert.ok(i18n.includes(JSON.stringify(key)+":"),"Missing translation "+key);
    assert.ok(js.includes('t("'+key+'")')||js.includes('"'+key+'"'));
  }
  assert.doesNotMatch(js,/ROMANO_QR_SIGNING_SECRET|SERVICE_ROLE_KEY/);
});

test("KDS sound alerts require opt-in and ignore the initial order list",()=>{
  const html=read("admin/index.html");
  const script=read("admin/orders.js");
  const translations=read("admin/admin-i18n.js");
  assert.match(html,/id="orders-sound"[^>]*aria-pressed="false"/);
  assert.match(script,/let soundEnabled = false;/);
  assert.match(script,/let orderBaselineReady = false;/);
  assert.match(script,/orderBaselineReady && incoming\.some/);
  assert.match(script,/if\(!soundEnabled \|\| !audioContext/);
  for(const key of ["فعال‌سازی اعلان صوتی","قطع اعلان صوتی"]){
    assert.ok(translations.includes(JSON.stringify(key)+":"),"Missing sound translation: "+key);
  }
});
