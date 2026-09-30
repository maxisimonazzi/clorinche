# Colorines — arquitectura y contratos

App web estática para chicos de 3 a 8 años: colorear, pizarra mágica, neón, fuegos artificiales,
subir imágenes y galería. Todo en español (rioplatense: "tocá", "mantené apretado"), sin backend.

## 1. Principios

- **Scripts clásicos**, no módulos ES: todo cuelga de `window.CL` y se carga con `<script defer>` en el
  orden de `app/index.html`. Así la app funciona con doble clic en `index.html` (file://) y también servida por http(s).
  Cada archivo es una IIFE: `(function (CL) { 'use strict'; ... })(window.CL);`
- **Nada de dependencias externas** ni CDNs (tiene que andar sin internet). Nada de `fetch()` de archivos locales
  (en file:// falla): los dibujos son strings dentro de JS.
- **Nada que requiera saber leer**: botones grandes con íconos a color (SVG inline). El texto accesible va en
  `aria-label`/`title` en español. Mínimo 46 px de lado para cualquier cosa tocable (ideal 54–84 px).
- **Borrar = mantener apretado**: cualquier acción destructiva usa `CL.ui.holdButton` (nunca un tap simple ni `confirm()`).
- **Sonidos suaves** con `CL.sound` (Web Audio sintetizado); respetar el botón de silencio global.
- **Sin scroll ni zoom accidental**: superficies de dibujo con `CL.ui.noGestures(el)` (touch-action: none). Las listas
  que sí scrollean usan la clase `.scroll-y` / `.scroll-x`.
- **Pointer Events** para todo (mouse, dedo, lápiz). Multitouch: seguir cada `pointerId` por separado.
  Usar `setPointerCapture`. Para trazos suaves, usar `ev.getCoalescedEvents()` si existe.
  Lápiz: `ev.pressure` (usar `CL.util.pressure(ev)`).
- **Nitidez en alta resolución**: todo canvas visible tiene backing store = tamaño CSS × `CL.util.dpr()` y se
  redimensiona con `ResizeObserver`/`resize` sin perder el contenido.
- **Rendimiento**: 60 fps en tablet. Nada de `getImageData` por frame en pantallas grandes. `requestAnimationFrame`
  para animaciones; detenerlo en `unmount()`.

## 2. Estructura y dueños de archivos

```
app/                      ← la app (esto es lo que se abre / se publica)
  index.html              (núcleo — no editar salvo integración)
  manifest.webmanifest, sw.js, icons/        → agente PWA
  fonts/fredoka.woff2     (fuente Fredoka, OFL)
  css/core.css            (núcleo)
  css/home.css, css/galeria.css              → agente galería+inicio
  css/juegos.css                             → juegos
  css/colorear.css                           → agente colorear
  css/subir.css                              → agente subir
  css/pizarra.css                            → agente pizarra
  css/neon.css                               → agente neón
  css/fuegos.css                             → agente fuegos
  js/core/ns.js icons.js sound.js db.js ui.js router.js   (núcleo — no editar)
  js/main.js                                  (núcleo — no editar)
  js/drawings/registry.js                     (núcleo — no editar)
  js/drawings/<categoria>.js                  → un agente por categoría (granja, mascotas, selva, mar, dinosaurios,
                                                vehiculos, naturaleza, comida, fantasia, paisajes)
  js/coloring/regions.js fills.js engine.js picker.js colorear.js → agente colorear
  js/upload/subir.js                          → agente subir
  js/pizarra/brushes.js stamps.js pizarra.js  → agente pizarra
  js/pizarra/neon.js                          → agente neón
  js/pizarra/fuegos.js                        → agente fuegos
  js/gallery/galeria.js, js/home.js           → agente galería+inicio
  js/gallery/imprimir.js                      → hoja para imprimir en PDF (CL.print), la usa la galería
  js/juegos/juegos.js                         → juegos: Colores y Números con voz (CL.games)
dev/                      ← herramientas de verificación (no se publican)
  lib.mjs                 helpers Playwright (Edge headless): launch, appUrl, shot, stroke, multiStroke, tap...
  drawings/preview.mjs    vista previa de dibujos con zonas coloreadas al azar
  shots/<area>/           capturas de cada agente
  <area>/                 scripts de prueba de cada agente
```

**Regla de oro**: cada agente edita SÓLO sus archivos. Si necesitás algo del núcleo que no está, resolvelo dentro de
tus archivos (p. ej. tus propios íconos con `CL.icons.add`, tus sonidos con `CL.sound.define`) y anotalo en tu
reporte final como "pedido al núcleo". No se pueden agregar archivos nuevos al index.html: usá los que tenés.
Estilos: siempre bajo el prefijo `.screen--<ruta>` para no pisar a otros.

## 3. API del núcleo (ya implementada)

### `CL.util` (ns.js)
`clamp, lerp, dist, rand, randInt, pick, shuffle, uid(), debounce(fn, ms)` (con `.flush() .cancel() .pending()`),
`sleep(ms), nextFrame(), dpr()`, `el('tag.clase1.clase2', attrs, hijos)` (attrs: `onclick`, `style` objeto,
`dataset`, `text`, `html`, cualquier atributo), `canvas(w,h)`, `loadImage(src)`, `blobToImage(blob)`,
`svgToImage(svgText)`, `canvasToBlob(canvas, type, q)`, `thumbnail(source, maxSide=480, bg='#fff')` → canvas,
`downloadBlob(blob, nombre)`, `fileName(base, ext = 'png')` → `colorines-vaca-2026-09-27.png`, `hsl(h,s,l,a)`,
`hexToRgb, rgbToHex, mix(a,b,t)`, `localPoint(ev, el)`, `pressure(ev)`, `isCoarse()`,
`pref.get(key, def) / pref.set(key, v)` (localStorage seguro, para preferencias chicas), `emitter()`.
`CL.bus` es un emisor global.

### `CL.icons` / `CL.icon(name, cls?)` (icons.js)
Íconos 48×48 a color, estilo: contorno `#2b2240` de 3 px, rellenos alegres. `CL.icons.STROKE` tiene los atributos
de contorno estándar. Agregar propios: `CL.icons.add({ miIcono: '<path .../>' })` (sólo el contenido del `<svg>`).
Disponibles: `home back close undo redo trash soundOn soundOff check download plus minus camera photo gallery star
heart hand play pencilEdit folder modePizarra modeNeon modeFuegos`.

### `CL.sound` (sound.js)
`play(name, opts)`; base: `tap pop select splash undo redo erase whoosh tada sparkle stamp tick delete shutter open nope`
(`opts.pitch` en algunos). Loop: `const h = CL.sound.loop('scribble', {freq, vol}); h.update({speed}); h.stop();`.
Definir propios: `CL.sound.define('boom', (s, opts) => { s.tone({...}); s.noise({...}); })` y
`CL.sound.defineLoop(name, (s, opts) => ({ update(p){}, stop(){} }))`. `s.ac` es el AudioContext, `s.out` el master,
`s.tone({freq,to,type,at,attack,decay,vol,dest})`, `s.noise({at,dur,attack,vol,type,freq,to,q,dest})`,
`s.env(gain,t,a,d,peak)`, `s.noiseBuffer()`. Silencio: `isMuted() setMuted(b) toggle()`; `CL.sound.events.on('mute', fn)`.
Volúmenes suaves (0.05–0.2). Nada estridente.

### `CL.db` (db.js) — IndexedDB `colorines`
La app antes se llamaba **Colorinche**: la primera vez que se abre la base, `db.js` pasa lo guardado en la base
anterior `colorinche` y la borra (marca `migrado-colorinche` en `kv`); `ns.js` hace lo mismo con las claves
`colorinche.*` de localStorage, y `sw.js` borra las cachés `colorinche|...` de su alcance. Esos son los únicos
lugares de la app donde queda el nombre viejo (en `dev/pwa`, las pruebas que simulan el service worker viejo).
- `CL.db.works`: `list({status, kind, source})`, `get(id)`, `save(work)` → devuelve la obra con `id/createdAt/updatedAt`,
  `findProgress(kind, source)`, `del(id)`.
- `CL.db.uploads`: `list()` (visibles), `get(id)`, `save(up)`, `remove(id)` (borra progreso; si hay obras terminadas
  que la usan la oculta en vez de borrarla).
- `CL.db.kv.get(key, def) / set(key, value)`. `CL.db.events.on('change', fn)`.

Modelo:
```
uploads: { id, createdAt, w, h, blob: PNG blanco/negro puro (líneas negras sobre blanco opaco), thumb: Blob }
works:   { id, kind: 'colorear'|'pizarra'|'neon', source, status: 'progress'|'done',
           createdAt, updatedAt, w, h,
           paint: Blob PNG con transparencia (colorear: capa de pintura; pizarra/neón: capa de trazos),
           thumb: Blob (miniatura compuesta final, ~480 px, PNG o JPEG),
           meta: {} }
  colorear: source = id del dibujo ('vaca') o 'u-<idUpload>'.
  pizarra:  source = 'pizarra'; meta.bg = id del fondo.   neón: source = 'neon'.
```
Flujo: abrir un dibujo desde el catálogo → `findProgress('colorear', id)` o una obra nueva. Autoguardado (debounce
~800 ms tras cada acción + `flush()` al salir). "¡Terminé!" → `status: 'done'`, festejo, ir a `obras/<id>`.
La próxima vez que se elige ese dibujo del catálogo, empieza en blanco (no hay progreso). Abrir una obra terminada
desde la galería (`colorear/<dibujo>/<workId>`) sigue editando ESA obra (sigue en 'done').
Pizarra y neón: igual (`pizarra` / `pizarra/<workId>`, `neon` / `neon/<workId>`). Fuegos no guarda nada.

### `CL.ui` (ui.js)
`button({icon, label, cls, onTap, sound='tap', text})`, `holdButton({icon='trash', label, cls, duration=1200, onConfirm})`,
`muteButton()`, `homeButton()`, `backButton(path?)`, `celebrate()` → promesa (~2.4 s, confites + estrella + fanfarria),
`toast(icon)`, `modal(node, {onClose})` → `{root, close}`, `spinner(root)` → función para quitarlo,
`modeTabs(actual)` → pestañas Pizarra/Neón/Fuegos (navegan a `pizarra`, `neon`, `fuegos`), `noGestures(el)`.
Clases CSS de botones: `.btn` (círculo blanco con sombra), `.btn-sm`, `.btn-lg`, `.btn-pill` (con texto), `.btn-go`
(verde), `.active` (seleccionado). Variables: `--btn --btn-sm --btn-lg --gap --radius --shadow --ink --red --orange
--yellow --green --blue --purple --pink --bg --paper --font --app-h --safe-*`.

### `CL.router` (router.js)
`register(nombre, { mount(root, args), unmount(), flush() })`, `go(path)`, `replace(path)`, `back()`, `current`.
`root` es un `<section class="screen screen--<nombre>">` a pantalla completa (flex column). `unmount` puede devolver
una promesa (se espera antes de mostrar la siguiente pantalla): usala para terminar de guardar.
`flush()` se llama al pasar a segundo plano o cerrar: arrancá el guardado ya.

Rutas:
| hash | pantalla | dueño |
|---|---|---|
| `#inicio` (por defecto) | inicio: 5 tarjetas grandes (Colorear, Pizarra, Juegos, Subir foto, Mis obras) + sonido; abajo "Para familias" y "Ayuda" (ventanas) | galería+inicio |
| `#dibujos` / `#dibujos/<cat>` | catálogo por categorías (incluye "Mis dibujos" = `mis`) | colorear |
| `#colorear/<dibujo>` / `#colorear/<dibujo>/<workId>` | colorear (`<dibujo>` = 'vaca' o 'u-<id>') | colorear |
| `#subir` | subir imagen | subir |
| `#pizarra` / `#pizarra/<workId>` | pizarra mágica | pizarra |
| `#neon` / `#neon/<workId>` | modo neón | neón |
| `#fuegos` | fuegos artificiales | fuegos |
| `#obras` / `#obras/<workId>` | galería (el id opcional se resalta) | galería+inicio |
| `#juegos` / `#juegos/colores` / `#juegos/numeros` | menú de juegos / Colores / Números | juegos |

### `CL.drawings` (registry.js)
`add(cat, id, nombre, innerSvg)`, `get(id)`, `list(cat?)`, `all()`, `svg(id, size?)` → SVG completo con fondo blanco
(el `size` fija width/height para rasterizar nítido), `categories` (id, name, color, cover), `category(id)`,
`SIZE=1000`, `STROKE=16`.

## 4. Aspecto

- Fondo crema cálido (`--bg`), botones blancos redondos con sombra "caramelo", íconos multicolor, fuente Fredoka.
- Alegre pero limpio: nada de texto innecesario, nada de menús escondidos. Todo a un toque.
- Tamaños de prueba obligatorios (ver `SIZES` en `dev/lib.mjs`): `desktop` 1366×768, `tablet` 1024×768 (dpr 2),
  `tabletV` 768×1024, `phone` 390×844 (dpr 3), `phoneH` 844×390, `phoneSmall` 360×640. Nada puede quedar cortado ni
  superpuesto en ninguno. Respetar `env(safe-area-inset-*)` (ya hay padding en `.screen`).
- Animaciones cortas y suaves; `prefers-reduced-motion` las reduce.

## 5. Reglas de los dibujos para colorear

Formato: `CL.drawings.add('granja', 'vaca', 'Vaca', \`...\`)`, contenido dentro de
`<g fill="#fff" stroke="#000" stroke-width="16" stroke-linecap="round" stroke-linejoin="round">` en un lienzo 1000×1000
(el `<g>` y el fondo blanco los pone `registry.js`). IDs: minúsculas sin tildes (`hamster`, `tiburon`, `camion-bomberos`).

1. **Estilo tierno de libro para colorear infantil**: contornos negros gruesos y parejos (16; detalles internos ≥ 10,
   nunca más finos), formas simples y redondeadas, proporciones "chibi" (cabeza grande), caritas simpáticas
   (ojos con pupila negra y brillito blanco, cachetes, sonrisa). Personaje centrado, ocupando ~75–90 % del lienzo,
   margen ≥ 40 u. Puede tener un suelo/pastito/olas simple si ayuda, sin llenar de detalles.
2. **Reconocible a primera vista** por un chico de 3 años: rasgos característicos exagerados (trompa del elefante,
   cuello de la jirafa, rayas de la cebra, cresta y barbilla de la gallina, manchas de la vaca, etc.).
3. **Zonas cerradas**: toda zona para pintar es un área totalmente rodeada de línea. Formas cerradas (`z`, `circle`,
   `ellipse`, `rect`). Las formas se superponen y el orden importa: lo que va adelante se dibuja después (su relleno
   blanco tapa las líneas de atrás). Las líneas de detalle abiertas (`fill="none"`) deben o bien quedar flotando dentro
   de una zona (no la cortan) o bien tocar/cruzar con claridad (≥ 8 u de solapamiento) las líneas donde terminan.
   Nunca dejar huecos chicos entre líneas: el balde se escapa.
4. **Zonas grandes**: cada zona pintable ≥ ~45×45 u (un dedo de 4 años). Evitar tiras finas entre dos líneas paralelas
   (< 25 u de ancho). Las zonas diminutas (< 0,04 % del área, p. ej. el brillito de una pupila) quedan bloqueadas y
   blancas automáticamente: está bien para brillitos, no para partes del dibujo.
5. **Relleno negro** (`fill="#000"`) sólo para pupilas, fosas nasales y detalles mínimos. Ruedas, manchas, etc. van
   blancas para que se pinten.
6. Sin texto, sin degradés, sin opacidades, sin `<image>`, sin filtros, sin `<use>` ni `<defs>`, sin `transform`
   complicados (se permite `transform="translate()/rotate()/scale(-1,1)"` en grupos para espejar partes).
7. Tamaño: cada dibujo < 6 KB de SVG si es posible (paths con curvas, números enteros).

### 5 bis. Paisajes (escenarios completos, `js/drawings/paisajes.js`)

Mismas reglas de línea, estilo y zonas, con estas diferencias:
- La escena ocupa el lienzo ENTERO (1000 × 1000, sin marco): cielo, suelo, agua, etc. son zonas que llegan a los
  bordes. El borde del lienzo cierra esas zonas, así que toda línea que toque un borde tiene que PASARSE del borde
  (p. ej. el horizonte de x = −30 a x = 1030) para que no quede un hueco en la orilla.
- Composición clara con 3–4 planos grandes (cielo / fondo / suelo / frente) y un protagonista reconocible en primer
  plano (sombrilla y balde en la playa, iglú y pingüino en el polo, carpa y fogata en el camping...). Nada de
  detalles chiquitos amontonados: cada elemento es una zona grande pintable. Entre ~15 y ~45 zonas pintables.
- Pueden tener caritas simpáticas (sol, nubes, casita, planetas) en el mismo estilo que el resto de la app.
- La zona que toca la esquina superior izquierda suele ser el cielo: en la vista previa sale celeste pálido; eso está
  bien. Lo que NO puede pasar es que un objeto (una nube, una montaña) salga celeste pálido: eso es una fuga.

Verificación: `node dev/drawings/preview.mjs <categoria>` genera `dev/shots/drawings/<categoria>.png` con cada zona
pintada de un color al azar y el FONDO en celeste pálido fijo: si una parte del animal sale celeste pálido, se escapa
al fondo. `--id vaca,gato` genera individuales grandes (líneas + coloreado) en `dev/shots/drawings/single/`.
Mirá las imágenes (herramienta Read) y corregí hasta que estén perfectas.

## 6. Motor de colorear (contrato para otros módulos)

`CL.regions.compute(lineCanvas)` → objeto `RegionMap`:
`{ w, h, label: Int32Array (id de zona por píxel; los píxeles de línea se asignan a la zona pintable más cercana),
count, area: Uint32Array, bbox: [{x0,y0,x1,y1}], locked: Uint8Array (1 = zona diminuta, no se pinta), bg: id de la
zona que toca el borde (o -1), at(x, y) → id }`.
`CL.regions.lineLayer(source, w, h)` → canvas negro con alfa (alfa = oscuridad) desde un SVG rasterizado o una imagen
blanco/negro. Pared = luminancia < 150.
`CL.coloring.renderRandom(drawingIdOrUpload, size)` → canvas con las zonas pintadas al azar (lo usa la hoja de control).

## 6 bis. Exportar obras (lo usa la galería para "descargar PNG" e "imprimir")

Cada módulo dueño de un tipo de obra expone una función que arma la imagen final en alta resolución:
- `CL.coloring.exportPNG(work)` → `Promise<Blob>` (fondo blanco + pintura + líneas encima).
- `CL.pizarra.exportPNG(work)` → `Promise<Blob>` (fondo elegido + trazos).
- `CL.neon.exportPNG(work)` → `Promise<Blob>` (fondo oscuro + trazos brillantes).
Si alguna no existe todavía, la galería usa `work.thumb` como respaldo.

Imprimir: `CL.print.pdf(imagen, { title })` → `Promise<Blob>` (js/gallery/imprimir.js) arma una hoja A4 con el logo,
"Colorines" con letras de colores, www.colorines.com.ar, el título y la obra; el PDF es mínimo (una imagen JPEG que
cubre la hoja) y no usa librerías. En colorear, antes de descargar o imprimir la galería pregunta con las dos
imágenes si va pintado o sin pintar; el sin pintar sale de `CL.coloring.exportPNG({ ...obra, paint: null })`.

Voz (juegos): `CL.games.say(texto)` usa `speechSynthesis`; prefiere la voz "Microsoft Sabina - Spanish (Mexico)",
después la voz por defecto si es en español, después cualquier voz en español. Respeta el botón de sonido.
Para abrir una obra: colorear → `colorear/<source>/<id>`, pizarra → `pizarra/<id>`, neón → `neon/<id>`.

## 7. Verificación

Por defecto se hace la **verificación mínima** de `CLAUDE.md` (raíz). La **verificación completa** de abajo es
**opcional**: se ofrece al usuario al terminar la tarea y se corre sólo si acepta.
No toques archivos de otros agentes. No borres capturas ajenas.

### 7 bis. Verificación completa (sólo si el usuario la acepta)

- Escribí tus scripts en `dev/<area>/` usando `dev/lib.mjs` (Edge headless con Playwright, ya instalado en `dev/`):
  `cd dev && node <area>/prueba.mjs`. La app se abre por file:// con `appUrl('ruta')`.
- Capturas en `dev/shots/<area>/...` y **mirarlas** con la herramienta Read (ves la imagen). Probá los 3 tamaños
  mínimos: `desktop`, `tablet` y `phone` (y `phoneH`/`tabletV` si tu pantalla depende de la orientación).
- `t.errors` tiene que quedar vacío (errores de consola y excepciones).
- Multitouch real: `multiStroke(page, [recorrido1, recorrido2])`, gestos a mano con `touchStart/touches`.
- Medí fluidez donde haya animación: contá frames con `requestAnimationFrame` durante 2 s dentro de la página
  (`page.evaluate`) — headless corre sin GPU, así que tomalo como cota inferior; optimizá si da < 40 fps en desktop.
- Además, los scripts generales que correspondan: `hoja-control.mjs`, `e2e/flujo.mjs`, `integracion/*.mjs`,
  `pwa/pwa-test.mjs`.
- No toques archivos de otros agentes. No borres capturas ajenas.
