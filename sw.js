/* Holidays Made Simple — keep the load screen up until this open has the newest guide. */
const SHELL = 'gg-shell-v4';

function isDocument(req){
  return req.mode === 'navigate' || req.destination === 'document';
}

function isGuide(url){
  return url.pathname === '/' || url.pathname === '/index.html';
}

function isAppShell(url, req){
  if (url.origin !== self.location.origin) return false;
  if (isDocument(req)) return true;
  const path = url.pathname;
  return path.endsWith('/') || path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.webmanifest') || /\/icons\/[^/]+\.png$/.test(path);
}

let shellVerdict = '';
const shellWaiters = [];

function settleShell(type){
  shellVerdict = type;
  const pending = shellWaiters.splice(0);
  pending.forEach(fn => { try { fn(); } catch (e) {} });
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    clients.forEach(client => client.postMessage({ type }));
  }).catch(() => {});
}

async function sig(res){
  const bytes = await res.clone().arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].join(',');
}

async function sameShell(cached, fresh){
  const pair = await Promise.all([sig(cached), sig(fresh)]);
  return pair[0] === pair[1];
}

async function remember(cache, fresh){
  try {
    const headers = new Headers();
    ['content-type', 'etag', 'last-modified'].forEach(key => {
      const value = fresh.headers.get(key);
      if (value) headers.set(key, value);
    });
    const copy = new Response(await fresh.clone().arrayBuffer(), { status: 200, headers });
    await cache.put(new Request('/'), copy);
  } catch (e) {}
}

async function cachedGuide(cache){
  return await cache.match('/') || await cache.match('/index.html');
}

async function pullGuide(req){
  try {
    const fresh = await fetch(req, { cache: 'no-store' });
    if (fresh && fresh.ok) return fresh;
  } catch (e) {}
  return null;
}

self.addEventListener('install', event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const hadGuide = keys.length > 0;
    await Promise.all(keys.filter(key => key !== SHELL).map(key => caches.delete(key)));
    await self.clients.claim();
    if (!hadGuide) return;
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach(client => client.postMessage({ type: 'newer-shell' }));
  })());
});

function guideJob(req){
  let resolveResponse;
  const response = new Promise(resolve => { resolveResponse = resolve; });
  const done = (async () => {
    try {
      const cache = await caches.open(SHELL);
      const cached = await cachedGuide(cache);
      shellVerdict = '';
      shellWaiters.length = 0;
      const pull = pullGuide(req);
      if (cached) {
        const snapshot = cached.clone();
        resolveResponse(cached);
        const fresh = await pull;
        if (!fresh) { settleShell('shell-current'); return; }
        let newer = true;
        try { newer = !(await sameShell(snapshot, fresh)); } catch (e) { newer = true; }
        await remember(cache, fresh);
        settleShell(newer ? 'newer-shell' : 'shell-current');
        return;
      }
      const fresh = await pull;
      if (fresh) {
        await remember(cache, fresh);
        settleShell('shell-current');
        resolveResponse(fresh);
        return;
      }
      settleShell('shell-current');
      resolveResponse(new Response('', { status: 503, statusText: 'offline' }));
    } catch (e) {
      settleShell('shell-current');
      resolveResponse(new Response('', { status: 503, statusText: 'offline' }));
    }
  })();
  return { response, done };
}

async function serveAsset(req, url){
  const cache = await caches.open(SHELL);
  try {
    const fresh = await fetch(req, { cache: 'no-store' });
    if (fresh && fresh.ok) {
      try { await cache.put(url.pathname, fresh.clone()); } catch (e) {}
      return fresh;
    }
  } catch (e) {}
  const cached = await cache.match(url.pathname);
  if (cached) return cached;
  return new Response('', { status: 503, statusText: 'offline' });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!isAppShell(url, req)) return;
  if (isDocument(req) && isGuide(url)) {
    const job = guideJob(req);
    event.waitUntil(job.done);
    event.respondWith(job.response);
    return;
  }
  event.respondWith(serveAsset(req, url));
});

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'recheck-shell') {
    event.waitUntil((async () => {
      const cache = await caches.open(SHELL);
      const cached = await cachedGuide(cache);
      const fresh = await pullGuide(new Request(new URL('./', self.registration.scope).href));
      let type = 'shell-current';
      if (fresh) {
        let newer = false;
        try { newer = cached ? !(await sameShell(cached, fresh)) : false; } catch (e) { newer = !!cached; }
        await remember(cache, fresh);
        if (newer) type = 'newer-shell';
      }
      if (event.source) event.source.postMessage({ type });
    })());
    return;
  }
  if (data.type !== 'shell-status') return;
  const reply = () => {
    if (event.source && shellVerdict) event.source.postMessage({ type: shellVerdict });
  };
  if (shellVerdict) reply();
  else shellWaiters.push(reply);
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
