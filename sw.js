const CACHE_NAME = "romano-v4.6-production-1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./css/romano.css",
  "./js/data.js",
  "./js/i18n.js",
  "./js/app.js",
  "./assets/images/logo/logo.png",
  "./assets/images/hero/hero.jpg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("romano-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.includes("/admin/")) return;

  const isDocument = request.mode === "navigate" || request.destination === "document";
  const isStaticCode = ["script", "style"].includes(request.destination);
  const isImage = request.destination === "image";

  if (isDocument || isStaticCode) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match("./index.html")))
    );
    return;
  }

  if (isImage) {
    event.respondWith(
      caches.match(request).then(cached => {
        const network = fetch(request).then(response => {
          if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
          return response;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});
