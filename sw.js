/* Holidays Made Simple — show the cached guide at once, then pick up the newest copy. */
const SHELL = 'gg-shell-v3';

function isDocument(req){
  return req.mode === 'navigate' || req.destination === 'document';
}

function isAppShell(url, req){
  if (url.origin !== self.location.origin) return false;
  if (isDocument(req)) return true;
  const path = url.pathname;
  return path.endsWith('/') || path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.webmanifest') || /\/icons\/[^/]+\.png$/.test(path);
}

self.addEventListener('install', event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== SHELL).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

function stamp(res){
  if (!res) return '';
  return res.headers.get('etag') || res.headers.get('last-modified') || '';
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!isAppShell(url, req)) return;
  event.respondWith((async () => {
    const cache = await caches.open(SHELL);
    const cached = isDocument(req) ? await cache.match(req, { ignoreSearch: true }) : await cache.match(url.pathname);
    const pull = fetch(req, { cache: 'no-store' }).then(fresh => {
      if (fresh && fresh.ok) {
        const saved = new Request(url.pathname + url.search);
        cache.put(saved, fresh.clone()).catch(() => {});
      }
      return fresh;
    }).catch(() => null);

    if (isDocument(req) && cached) {
      event.waitUntil((async () => {
        const fresh = await pull;
        if (!fresh) return;
        const before = stamp(cached);
        const after = stamp(fresh);
        if (!before || !after || before === after) return;
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clients.forEach(client => client.postMessage({ type: 'newer-shell' }));
      })());
      return cached;
    }

    const fresh = await pull;
    if (fresh) return fresh;
    if (cached) return cached;
    return new Response('', { status: 503, statusText: 'offline' });
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
