importScripts("./js/sw-cache.js");
const CACHE_NAME = `${menuCachePrefix}r27-lazy-profile`;
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
  "./css/connect.css",
  "./js/data.js",
  "./js/demo-branches.js",
  "./js/public-api.js",
  "./js/i18n.js",
  "./js/money.js",
  "./js/app.js",
  "./js/menu-experience.js",
  "./js/commerce.js",
  "./js/connect-core.js",
  "./js/connect-demo.js",
  "./js/connect-live.js",
  "./js/connect-customer.js",
  "./js/customer-panels.js",
  "./js/demo-review.js",
  "./js/demo-members.js",
  "./js/phone-auth.js",
  "./js/customer-entry.js",
  "./assets/images/logo/brand-mark-144.webp",
  "./assets/images/hero/hero.jpg"
];

function cacheable(response) {
  const policy = response.headers.get("Cache-Control") || "";
  return response.status === 200 && response.type === "basic" && !response.redirected &&
    !/(?:^|,)\s*(?:no-store|private|no-cache)(?:\s*[,=]|\s*$)/i.test(policy) &&
    response.headers.get("Vary") !== "*";
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const scope = self.registration.scope;
    await Promise.all(CORE_ASSETS.map(async asset => {
      const url = new URL(asset, scope).href;
      const response = await fetch(url, {credentials:"omit", redirect:"error", cache:"reload"});
      if (!response.ok) throw new Error("Public asset unavailable");
      if (cacheable(response)) await cache.put(url, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil(cleanMenuCaches(CACHE_NAME).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  // Cache only public, query-free paths belonging to this installation.
  // Do not intercept private routes, unknown navigation URLs, or token-bearing requests.
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname) ||
      url.pathname.includes("/admin/") || url.pathname.endsWith("/admin") || url.pathname.includes("/api/") ||
      url.search || request.cache === "no-store" || request.headers?.has("Authorization") ||
      request.headers?.has("Range")) return;
  const relative = url.pathname.slice(scope.pathname.length);
  const isDocument = (request.mode === "navigate" || request.destination === "document") &&
    (relative === "" || relative === "index.html");
  const isStaticCode = ["script", "style"].includes(request.destination) &&
    CORE_ASSETS.includes("./" + relative);
  const isImage = request.destination === "image" && relative.startsWith("assets/");
  const isFont = request.destination === "font" && relative.startsWith("assets/");
  if (!isDocument && !isStaticCode && !isImage && !isFont) return;
  const match = key => caches.open(CACHE_NAME).then(cache => cache.match(key)).catch(() => undefined);
  const store = response => {
    // Honor explicit response privacy policy and do not persist redirects or partial responses.
    if (!cacheable(response)) return;
    const copy = response.clone();
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {}));
  };

  if (isDocument || isStaticCode) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Never cache error pages; they would be served as the "offline" copy later.
          store(response);
          return response;
        })
        .catch(async () => (await match(request)) || (isDocument && await match("./index.html")) || new Response("", { status: 503 }))
    );
    return;
  }

  if (isImage || isFont) {
    event.respondWith(
      match(request).then(cached => {
        // Bundled media are versioned by CACHE_NAME. A hit needs no extra network transfer.
        if (cached) return cached;
        return fetch(request).then(response => {
          store(response);
          return response;
        }).catch(() => new Response("", { status: 503 }));
      })
    );
  }
});
