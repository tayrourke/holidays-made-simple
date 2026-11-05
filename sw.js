/* Holidays Made Simple — home-screen alerts, and a fresh copy of the guide on every open. */
const SHELL = 'gg-shell-v2';

function isAppShell(url, req){
  if (url.origin !== self.location.origin) return false;
  if (req.mode === 'navigate' || req.destination === 'document') return true;
  const path = url.pathname;
  return path.endsWith('/') || path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.webmanifest');
}

self.addEventListener('install', event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== SHELL).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!isAppShell(url, req)) return;
  event.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: 'no-store' });
      if (fresh && fresh.ok && (req.mode === 'navigate' || req.destination === 'document')){
        const cache = await caches.open(SHELL);
        await cache.put(req, fresh.clone()).catch(() => {});
      }
      return fresh;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      throw err;
    }
  })());
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
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
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
