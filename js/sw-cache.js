/* Cache Storage is shared by all service workers on an origin. */
const menuCacheNamespace = 'ramen-online-menu-cache:';
const menuCachePrefix = `${menuCacheNamespace}${self.registration.scope}:`;

async function cleanMenuCaches(keep) {
  const scope = new URL(self.registration.scope);
  const ownedPaths = ['', 'index.html', 'css/', 'js/', 'assets/'];
  for (const name of await caches.keys()) {
    if (name === keep) continue;
    if (name.startsWith(menuCacheNamespace)) {
      if (name.startsWith(menuCachePrefix)) await caches.delete(name);
      continue;
    }
    if (!['romano-', 'online-menu-', 'ramen-online-menu-'].some(prefix => name.startsWith(prefix))) continue;

    // Older versions used origin-wide names. Delete a legacy cache only
    // when its documents and assets all belong to this deployment.
    const cache = await caches.open(name);
    const requests = await cache.keys();
    const paths = requests.map(request => new URL(request.url));
    const root = paths.some(url => url.href === scope.href || url.href === new URL('index.html', scope).href);
    if (root && paths.every(url => url.origin === scope.origin && url.pathname.startsWith(scope.pathname) &&
      ownedPaths.some(path => path.endsWith('/') ? url.pathname.slice(scope.pathname.length).startsWith(path) : url.pathname.slice(scope.pathname.length) === path))) {
      await caches.delete(name);
    }
  }
}
