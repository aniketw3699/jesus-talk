// Retire the former 1into1 with Jesus root-scoped PWA.
// The main 1into1.com site is now the corporate Implementation Assurance site.
self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith("1into1-"))
        .map(key => caches.delete(key))
    );

    await self.clients.claim();

    const clients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    for (const client of clients) {
      try {
        await client.navigate(client.url);
      } catch (_) {}
    }

    await self.registration.unregister();
  })());
});
