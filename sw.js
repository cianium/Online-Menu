importScripts("./js/sw-cache.js");
const CACHE_NAME = `${menuCachePrefix}r15-demo-membership`;
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./css/fonts.css",
  "./css/style.css",
  "./css/no-script.css",
  "./css/romano.css",
  "./css/menu-experience.css",
  "./css/commerce.css",
  "./css/ramen-navigation.css",
  "./css/interaction-system.css",
  "./css/catalog-browse.css",
  "./css/customer-polish.css",
  "./js/data.js",
  "./js/public-api.js",
  "./js/i18n.js",
  "./js/money.js",
  "./js/app.js",
  "./js/menu-experience.js",
  "./js/commerce.js",
  "./js/demo-review.js",
  "./js/demo-members.js",
  "./js/customer-entry.js",
  "./assets/images/logo/logo.png",
  "./assets/images/hero/hero.jpg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(cleanMenuCaches(CACHE_NAME).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.includes("/admin/") || url.pathname.endsWith("/admin") || url.pathname.includes("/api/")) return;

  // Never persist navigation URLs that may contain table tokens or payment callback identifiers.
  if (["qr", "payment", "order", "ref"].some(key => url.searchParams.has(key))) return;

  const isDocument = request.mode === "navigate" || request.destination === "document";
  const isStaticCode = ["script", "style"].includes(request.destination);
  const isImage = request.destination === "image";
  const isFont = request.destination === "font";
  const match = key => caches.open(CACHE_NAME).then(cache => cache.match(key)).catch(() => undefined);
  const store = response => {
    const copy = response.clone();
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {}));
  };

  if (isDocument || isStaticCode) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Never cache error pages; they would be served as the "offline" copy later.
          if (response.ok && response.type === "basic") {
            store(response);
          }
          return response;
        })
        .catch(async () => (await match(request)) || (isDocument && await match("./index.html")) || new Response("", { status: 503 }))
    );
    return;
  }

  if (isImage || isFont) {
    event.respondWith(
      match(request).then(cached => {
        const network = fetch(request).then(response => {
          if (response.ok && response.type === "basic") store(response);
          return response;
        }).catch(() => cached || new Response("", { status: 503 }));
        if (cached) event.waitUntil(network);
        return cached || network;
      })
    );
  }
});
