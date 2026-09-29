/* Colorines — COPIA DEL SERVICE WORKER ANTERIOR (hasta la revisión 2 de QA), sólo para pruebas.
   La usa dev/pwa/pwa-hosting.mjs para simular un dispositivo que ya tenía instalada la versión vieja:
   - guardaba las respuestas redirigidas tal cual (hosting que redirige /index.html → / ⇒ la app no abría);
   - su caché se llamaba 'colorinche-<versión>' (nombre anterior de la app, sin alcance) y borraba las de otras copias del mismo sitio.
   NO se publica (no está en app/). */
'use strict';

// <build-sw>
// </build-sw>

const PREFIX = 'colorinche-';
const CACHE = PREFIX + VERSION;
const SCOPE = new URL(self.registration.scope).pathname;
const INDEX = new URL('index.html', self.registration.scope).href;
const OWN = new Set(FILES);
const NET_TIMEOUT = 6000;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith(PREFIX) && n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === self.location.pathname) return;
  if (!url.pathname.startsWith(SCOPE)) return;
  const rel = url.pathname.slice(SCOPE.length);
  if (req.mode === 'navigate') {
    if (rel === '' || rel === 'index.html') event.respondWith(fromCache(INDEX, req));
    else if (OWN.has(rel)) event.respondWith(fromCache(url.href, req));
    else event.respondWith(otherPage(req));
    return;
  }
  if (OWN.has(rel)) event.respondWith(fromCache(req, req));
});

async function fromCache(key, req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(key, { ignoreSearch: true });
  if (hit) return hit;
  try {
    return await fetch(req);
  } catch (err) {
    if (req.mode === 'navigate') {
      const any = await caches.match(INDEX, { ignoreSearch: true });
      if (any) return any;
    }
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function otherPage(req) {
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), NET_TIMEOUT)),
    ]);
    if (res.status !== 404 && res.status !== 410) return res;
  } catch (err) { /* sin internet */ }
  return Response.redirect(INDEX, 302);
}
