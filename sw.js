/* Service worker de Recordatorios: funciona sin internet y maneja los toques en las notificaciones */
const CACHE = 'recordatorios-v5';
const ARCHIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
const FUENTES = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Muestra lo guardado al instante y actualiza en segundo plano */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const propio = url.origin === self.location.origin;
  if (!propio && !FUENTES.includes(url.hostname)) return;
  e.respondWith(
    caches.open(CACHE).then(async c => {
      const guardado = await c.match(req, { ignoreSearch: propio });
      const red = fetch(req)
        .then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; })
        .catch(() => guardado);
      return guardado || red;
    })
  );
});

/* Botones de la notificación: Cumplida / Aplazar 10 min */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const id = (e.notification.data || {}).id || '';
  const accion = e.action || 'abrir';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
      for (const c of lista) {
        c.postMessage({ tipo: 'accion', accion, id });
        return c.focus();
      }
      return self.clients.openWindow(`./?accion=${accion}&id=${encodeURIComponent(id)}`);
    })
  );
});
