/* Private, authenticated demo export only. No network interception or precaching. */
self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (["romano-", "online-menu-", "ramen-online-menu-"].some(prefix => key.startsWith(prefix))) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
