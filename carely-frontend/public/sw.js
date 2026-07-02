const CACHE = 'carely-v3';
const URLS = ['/', '/home', '/login', '/register'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(URLS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first: always prefer the latest deployed files. Only fall back to
// cache when the network is unavailable, so a stale cached index.html can
// never keep serving JS/CSS bundle names that a newer deploy has removed.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('/')))
  );
});

self.addEventListener('push', e => {
  if (!e.data) return;
  try {
    const data = e.data.json();
    const title = data.title || 'Carely';
    const options = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      data: { link: data.link || '/' },
      actions: [{ action: 'open', title: 'Open App' }],
      requireInteraction: false,
    };
    e.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Push error:', err);
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const link = e.notification.data?.link || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(link);
    })
  );
});
