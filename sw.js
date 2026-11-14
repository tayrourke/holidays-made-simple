/* Holidays Made Simple — alerts only.
   Do not answer page loads or reload open pages. That crashes iPhone Safari. */
self.addEventListener('install', event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

function isDocument(req){
  return req.mode === 'navigate' || req.destination === 'document';
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (isDocument(req)) return;
});

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let data = {};
    try { if (event.data) data = event.data.json(); } catch (e) {
      try { data = { body: event.data.text() }; } catch (e2) {}
    }
    const title = data.title || 'Holidays Made Simple';
    const body = data.body || 'a new door is open';
    const url = data.url || './#advent';
    const tag = data.tag || 'guide-door';
    await self.registration.showNotification(title, {
      body,
      icon: './icons/icon-192.png?v=gg53',
      badge: './icons/icon-192.png?v=gg53',
      tag,
      renotify: true,
      data: { url }
    });
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  let url = (event.notification.data && event.notification.data.url) || './#advent';
  try {
    const parsed = new URL(String(url), self.registration.scope);
    const origin = new URL(self.registration.scope).origin;
    url = parsed.origin === origin ? parsed.href : new URL('./#advent', self.registration.scope).href;
  } catch (e) {
    url = new URL('./#advent', self.registration.scope).href;
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
