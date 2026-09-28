/* Colorinche — service worker: la app entera queda guardada en el dispositivo y abre sin internet.

   - Al instalarse descarga TODOS los archivos de la app (lista generada por dev/build-sw.mjs) en una caché
     con nombre versionado: 'colorinche|<alcance>|<hash del contenido>'. El alcance va en el nombre porque
     la Cache Storage es de todo el origen: así dos copias de la app en el mismo sitio (p. ej.
     usuario.github.io/colorinche/ y usuario.github.io/colorinche-prueba/) no se pisan ni se borran entre sí.
   - Los archivos se guardan "limpios": si el hosting redirige (p. ej. /index.html → /, las "URLs lindas" de
     Cloudflare Pages, Vercel o Firebase), se guarda el contenido final sin la marca de redirección. Una
     respuesta redirigida no sirve para abrir una página: el navegador la rechaza y la app no abriría.
   - Los archivos de la app se sirven desde esa caché (cache-first). Cualquier otra cosa del mismo sitio
     (otras páginas o proyectos publicados en el mismo dominio) NO se toca: va a la red como siempre.
   - Navegación a la app ("./", "index.html", con #ruta o ?parámetros) → el index.html guardado.
     Navegación a otra dirección dentro del alcance: primero la red (si existe, se muestra tal cual); sólo si
     no hay internet o no existe (404) se redirige a la app.
   - Si la app se retira de esa dirección (sw.js da 404/410, p. ej. en localhost:8765 ahora se sirve otro
     proyecto), el SW se da de baja solo y borra su caché; las obras guardadas no se tocan.
   - Actualización: cuando cambia algún archivo, cambia la versión y por lo tanto este archivo. El navegador
     instala la versión nueva en segundo plano, se activa enseguida (skipWaiting + clients.claim) y borra las
     cachés viejas DE ESTE ALCANCE; la pantalla abierta sigue con lo que ya cargó y la próxima apertura usa
     la versión nueva. (El navegador busca un sw.js nuevo al cargar la página; una app que sólo se "reanuda"
     desde recientes no lo busca: ver el pedido al núcleo de llamar a registration.update() al volver a
     primer plano.)

   NO editar a mano la parte entre los marcadores: correr `node dev/build-sw.mjs` después de cambiar la app. */
'use strict';

// <build-sw> (generado por dev/build-sw.mjs — no editar a mano)
const VERSION = 'f42e62bf65f5';
const FILES = [
  'index.html',
  'css/colorear.css',
  'css/core.css',
  'css/fuegos.css',
  'css/galeria.css',
  'css/home.css',
  'css/neon.css',
  'css/pizarra.css',
  'css/subir.css',
  'fonts/OFL.txt',
  'fonts/fredoka.woff2',
  'icons/apple-touch-icon.png',
  'icons/icon-16.png',
  'icons/icon-192.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/icon-small.svg',
  'icons/icon.svg',
  'js/coloring/colorear.js',
  'js/coloring/engine.js',
  'js/coloring/fills.js',
  'js/coloring/picker.js',
  'js/coloring/regions.js',
  'js/core/db.js',
  'js/core/icons.js',
  'js/core/ns.js',
  'js/core/router.js',
  'js/core/sound.js',
  'js/core/ui.js',
  'js/drawings/comida.js',
  'js/drawings/dinosaurios.js',
  'js/drawings/fantasia.js',
  'js/drawings/granja.js',
  'js/drawings/mar.js',
  'js/drawings/mascotas.js',
  'js/drawings/naturaleza.js',
  'js/drawings/paisajes.js',
  'js/drawings/registry.js',
  'js/drawings/selva.js',
  'js/drawings/vehiculos.js',
  'js/gallery/galeria.js',
  'js/home.js',
  'js/main.js',
  'js/pizarra/brushes.js',
  'js/pizarra/fuegos.js',
  'js/pizarra/neon.js',
  'js/pizarra/pizarra.js',
  'js/pizarra/stamps.js',
  'js/upload/subir.js',
  'manifest.webmanifest',
];
// </build-sw>

const SCOPE_URL = self.registration.scope; // p. ej. 'https://usuario.github.io/colorinche/'
const PREFIX = 'colorinche|' + SCOPE_URL + '|';
const CACHE = PREFIX + VERSION;
const LEGACY = /^colorinche-[0-9a-f]{12}$/; // nombre de las versiones anteriores (sin alcance)
const SCOPE = new URL(SCOPE_URL).pathname; // p. ej. '/' o '/colorinche/'
const INDEX = new URL('index.html', SCOPE_URL).href;
const OWN = new Set(FILES);
const NET_TIMEOUT = 6000; // ms: una red "colgada" no deja la pantalla en blanco para siempre
let retired = false; // true cuando esta copia se dio de baja (ver checkRetired)

/** Copia "limpia" de una respuesta que vino de una redirección (mismo contenido, estado y cabeceras). */
async function unredirect(res) {
  if (!res.redirected) return res;
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      await Promise.all(FILES.map(async (f) => {
        // cache: 'reload' saltea la caché HTTP del navegador: así nunca se guarda un archivo viejo en la versión nueva.
        const res = await fetch(new Request(f, { cache: 'reload' }));
        if (!res.ok) throw new Error('precache ' + f + ' ' + res.status);
        await cache.put(f, await unredirect(res));
      }));
    } catch (err) {
      // Instalación a medias: se descarta y el navegador lo reintenta en la próxima apertura.
      await caches.delete(CACHE);
      throw err;
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(async (n) => {
      if (n === CACHE) return;
      // Versiones viejas de ESTA copia de la app (las de otras copias en el mismo sitio no se tocan).
      if (n.startsWith(PREFIX)) return caches.delete(n);
      // Cachés con el nombre anterior (sin alcance): se borran sólo si son de esta copia (tienen nuestro index.html).
      if (LEGACY.test(n) && (await (await caches.open(n)).match(INDEX, { ignoreSearch: true }))) return caches.delete(n);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // la app no usa nada externo
  if (url.pathname === self.location.pathname) return; // sw.js siempre de la red (nunca a la caché)
  if (!url.pathname.startsWith(SCOPE)) return;
  const rel = url.pathname.slice(SCOPE.length); // 'css/core.css', 'index.html', '' (raíz de la app)

  if (req.mode === 'navigate') {
    // La app usa rutas con # (index.html#pizarra): "./" e "index.html" son siempre la app.
    if (rel === '' || rel === 'index.html') {
      event.respondWith(fromCache(INDEX, req));
      event.waitUntil(checkRetired());
    }
    // Abrir directamente un archivo de la app (p. ej. icons/icon.svg) lo muestra tal cual.
    else if (OWN.has(rel)) event.respondWith(fromCache(url.href, req));
    // Otra dirección: puede ser otra página del mismo sitio → que decida la red.
    else event.respondWith(otherPage(req));
    return;
  }
  // Sólo los archivos de la app pasan por la caché; lo demás sigue su camino normal.
  if (OWN.has(rel)) event.respondWith(fromCache(req, req));
});

/** Busca `key` en la caché de esta versión (sin mirar ?parámetros); si no está, va a la red. */
async function fromCache(key, req) {
  // caches.match con cacheName no crea la caché si no existe (caches.open sí: revivía una caché ya borrada).
  const hit = await caches.match(key, { cacheName: CACHE, ignoreSearch: true });
  if (hit) {
    if (!hit.redirected) return hit;
    // Red de seguridad: una copia redirigida (guardada por una versión anterior) se limpia y se repara.
    const clean = await unredirect(hit);
    store(key, clean.clone());
    return clean;
  }
  try {
    const res = await fetch(req);
    // Falta un archivo propio (caché borrada a medias, poco espacio…): se vuelve a guardar para la próxima.
    if (res.ok && res.type === 'basic' && !res.redirected) store(key, res.clone());
    return res;
  } catch (err) {
    // Sin internet y sin copia: para una navegación, cualquier index guardado sirve (versión vieja incluida).
    if (req.mode === 'navigate') {
      const any = await caches.match(INDEX, { ignoreSearch: true });
      if (any) return unredirect(any);
    }
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

/** Guarda en la caché de esta versión sólo si todavía existe (nunca después de darse de baja). */
async function store(key, res) {
  try {
    if (!retired && (await caches.has(CACHE))) await (await caches.open(CACHE)).put(key, res);
  } catch (err) { /* sin espacio u otro problema: se sigue sirviendo de la red */ }
}

/**
 * ¿Esta copia de Colorinche fue retirada de la dirección? Si el servidor contesta que sw.js ya no existe
 * (404/410; p. ej. en localhost:8765 ahora se sirve otro proyecto), el SW se da de baja y borra SU caché:
 * desde la próxima apertura la dirección muestra lo que haya ahí. Sin internet o con otros errores no hace
 * nada. Las obras y fotos (IndexedDB) nunca se tocan; si la app vuelve a publicarse, se reinstala sola.
 */
async function checkRetired() {
  try {
    const res = await fetch(self.location.href, { cache: 'no-store' });
    if (res.status !== 404 && res.status !== 410) return;
    retired = true;
    await self.registration.unregister();
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith(PREFIX)).map((n) => caches.delete(n)));
  } catch (err) { /* sin internet: nada que revisar */ }
}

/** Navegación a una dirección que no es de la app: la red manda; si no hay red o no existe, a la app. */
async function otherPage(req) {
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), NET_TIMEOUT)),
    ]);
    if (res.status !== 404 && res.status !== 410) return res;
  } catch (err) { /* sin internet: a la app */ }
  // Redirección (y no el index directo) para que los archivos relativos del index se resuelvan bien.
  return Response.redirect(INDEX, 302);
}
