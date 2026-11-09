/* ══════════════════════════════════════════════════════════════════════════
   Paraveda CRM — Service Worker (v3.105)
   المسؤولية: إشعارات الطلبيات الجداد فقط.
   ⚠️ ما كنخزّنو حتى صفحة ولا نتيجة api.php فـ CacheStorage: أي كاش قديم
      كان كيرجّع نسخة قديمة ديال index.html/DATA للهاتف → «كتبناها وتمسحات».
   ══════════════════════════════════════════════════════════════════════════ */
const PV_SW_VERSION = 'paraveda-v105';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    /* مسح أي كاش تقني خلّاه Service Worker قديم (بلا مسح بيانات CRM) */
    try {
      if (self.caches && caches.keys) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }
    } catch (e) {}
    await self.clients.claim();
  })());
});

/* network-only على كلشي: ما كاين حتى cache-first */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                 // POST كيمشي مباشرة للسيرفر
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;
  if (path.endsWith('api.php') || path.endsWith('.html') || path.endsWith('/') ||
      path.endsWith('sw.js') || path.endsWith('manifest.json')) {
    event.respondWith(fetch(req, { cache: 'no-store' }));
  }
});

self.addEventListener('message', (event) => {
  const d = event.data || {};
  if (d.type === 'PV_SKIP_WAITING') self.skipWaiting();
  if (d.type === 'PV_PURGE_CACHE' && self.caches && caches.keys) {
    caches.keys().then(ns => Promise.all(ns.map(n => caches.delete(n))));
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { title: 'Paraveda CRM', body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Paraveda CRM', {
    body: data.body || '',
    tag: data.tag || 'pv-orders',
    renotify: true,
    icon: 'pv-icon-192.png',
    badge: 'pv-icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || './' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './', self.location.href).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope) && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
