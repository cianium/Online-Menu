import assert from "node:assert/strict";

const base = (process.env.ROMANO_PUBLIC_API_URL || "https://tjrzeourqvahtocwnzwd.supabase.co/functions/v1/romano-public").replace(/\/$/, "");

async function read(path, expected = 200) {
  const response = await fetch(base + path, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000)
  });
  assert.equal(response.status, expected, `${path}: expected HTTP ${expected}, received ${response.status}`);
  assert.match(response.headers.get("content-type") || "", /application\/json/i, `${path}: expected JSON`);
  return response.json();
}

const health = await read("/health");
assert.equal(health.data?.status, "ok");
assert.equal(health.error, null);

for (const lang of ["fa", "en", "tr", "ar"]) {
  const { data: menu, error } = await read(`/public/restaurants/romano/menu?lang=${lang}`);
  assert.equal(error, null);
  assert.equal(menu.restaurant?.slug, "romano");
  assert.equal(menu.categories?.length, 7);
  assert.equal(menu.products?.length, 21);
  for (const category of menu.categories) {
    assert.ok(category.id && category.name && category.translations?.[lang]?.name, `Missing category ${lang} translation`);
    assert.match(category.image, /^assets\/images\/categories\//);
  }
  for (const product of menu.products) {
    assert.ok(product.id && product.name && product.translations?.[lang]?.name, `Missing product ${lang} translation`);
    assert.ok(Number.isFinite(product.price) && product.price >= 0);
    assert.ok(menu.categories.some(c => c.id === product.category));
    assert.match(product.image, /^assets\/images\/products\//);
  }
  console.log(`OK ${lang}: 7 categories and 21 products`);
}

const categories = await read("/public/restaurants/romano/categories?lang=en");
assert.equal(categories.data?.categories?.length, 7);
const products = await read("/public/restaurants/romano/products?lang=en&category=burger");
assert.ok(products.data?.products?.length > 0);
assert.ok(products.data.products.every(p => p.category === "burger"));
const notFound = await read("/public/restaurants/nonexistent-restaurant/menu", 404);
assert.equal(notFound.error?.code, "MENU_NOT_FOUND");
const forbidden = await read("/admin/data", 404);
assert.equal(forbidden.error?.code, "NOT_FOUND");

console.log("Supabase ROMANO public API smoke test passed.");
