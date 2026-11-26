/* Private, authenticated demo export only. No network interception or precaching. */
importScripts("./js/sw-cache.js");
self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", event => {
  event.waitUntil(cleanMenuCaches().then(() => self.clients.claim()));
});
