import assert from "node:assert/strict";

const site = (process.env.ROMANO_SITE_URL || "https://food.kiankhayat.me").replace(/\/$/, "");
async function fetchChecked(path, expectedType, expectedStatus = 200) {
  const response = await fetch(site + path, { headers: { Accept: expectedType }, signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, expectedStatus, `${path}: received HTTP ${response.status} instead of ${expectedStatus}`);
  assert.match(response.headers.get("content-type") || "", expectedType === "image/jpeg" ? /image\//i : new RegExp(expectedType, "i"), `${path}: unexpected content type`);
  return response;
}

const html = await fetchChecked("/", "text/html");
assert.match(await html.text(), /ROMANO|رمانو/i, "Restaurant landing page is missing");
const response = await fetchChecked("/api/v1/public/restaurants/romano/menu?lang=fa", "application/json");
const body = await response.json();
assert.equal(body.error, null);
assert.equal(body.data?.restaurant?.slug, "romano");
assert.equal(body.data?.categories?.length, 7);
assert.equal(body.data?.products?.length, 21);
await fetchChecked("/" + body.data.products[0].image.replace(/^\/+/, ""), "image/jpeg");
console.log("Vercel domain, public Supabase proxy, and catalog image passed.");
