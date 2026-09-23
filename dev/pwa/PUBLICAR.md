# Colorinche: cómo abrirla, publicarla e instalarla

## 0. Antes de publicar (siempre)

Cada vez que cambie cualquier archivo de `app/`, como **último paso** antes de subirla:

```
cd dev
node build-sw.mjs
node pwa/pwa-test.mjs desktop,tablet,phone --strict
```

`build-sw.mjs` actualiza la lista de archivos y la versión dentro de `app/sw.js`. Si no lo corrés, `sw.js`
queda idéntico y **las tablets que ya la instalaron nunca reciben los cambios** (la app se sirve desde la
copia guardada en el dispositivo). La prueba `--strict` falla si `sw.js` quedó desactualizado.
`node serve.mjs` también avisa al arrancar si `sw.js` está desactualizado.

## A. En la compu

- **Lo más simple**: doble clic en `app/index.html`. Funciona todo (colorear, subir fotos, pizarra, neón,
  fuegos, galería; los datos se guardan en el navegador), pero por `file://` **no hay service worker ni
  instalación**: no se puede "Instalar app" y necesita la carpeta en la compu.
  Ojo: lo guardado por `file://` y lo guardado por `http://localhost` son datos **separados**.
- **Para instalarla en la compu**: `cd dev && node serve.mjs` y abrir `http://localhost:8765/` en Edge o
  Chrome → ícono "Instalar" en la barra de direcciones (o menú ⋯ → Aplicaciones → Instalar Colorinche).
  Después abre sola desde el menú Inicio, sin servidor y sin internet.
- **Mejor dejá el puerto 8765 para Colorinche** (la app instalada vive en esa dirección). Para otro proyecto
  usá otro puerto (p. ej. `node serve.mjs 9000` o el que use tu herramienta).
  Si igual servís otra cosa en el 8765: la **primera** vez que abras `http://localhost:8765/` vas a ver
  Colorinche una última vez (sale de la copia guardada); en ese momento Colorinche nota que en el servidor ya
  no está y se da de baja sola. Desde la apertura siguiente (recargá) se ve el otro proyecto. Las obras y
  fotos guardadas no se borran: si más adelante volvés a servir Colorinche ahí, se reinstala y siguen estando.
  Mientras tanto, la app instalada desde el 8765 no abre sin el servidor.
  Si hiciera falta liberarlo a mano: `edge://serviceworker-internals` (en Chrome
  `chrome://serviceworker-internals`) → buscar `http://localhost:8765/` → **Unregister** (o F12 →
  *Application* → *Service workers* → *Unregister*). **No uses "Borrar datos del sitio"**: eso borra también
  las obras y fotos guardadas en localhost.

## B. En una tablet o celular (Android / iPad / iPhone)

Para instalarse necesita estar publicada en **https**. Dos opciones gratuitas:

### Opción 1 (recomendada): GitHub Pages

1. Crear una cuenta gratis en github.com e iniciar sesión.
2. **+** → *New repository*. Nombre, por ejemplo, `colorinche`, **Public** (en el plan gratis Pages exige
   repositorio público). Usá un repositorio de *proyecto* como este y **no** el especial
   `<usuario>.github.io`: así la app queda en su propia carpeta (`https://<usuario>.github.io/colorinche/`)
   y no se mezcla con otras páginas tuyas.
3. En el repositorio: *Add file* → *Upload files* y arrastrar **el contenido** de `app/` (el `index.html` y las
   carpetas `css`, `js`, `icons`, `fonts`, más `manifest.webmanifest` y `sw.js`), no la carpeta `app` en sí:
   `index.html` tiene que quedar en la raíz del repositorio. *Commit changes*.
4. *Settings* → *Pages* → *Build and deployment* → *Deploy from a branch* → rama `main`, carpeta `/ (root)` → *Save*.
5. Esperar unos minutos (puede tardar hasta 10) y abrir `https://<usuario>.github.io/colorinche/`.
6. Para actualizar: correr el paso 0 y volver a subir los archivos cambiados (siempre también `sw.js`).

### Opción 2: Netlify Drop

1. **Primero** crear una cuenta gratis en netlify.com e **iniciar sesión**. Si arrastrás la carpeta sin
   sesión, el sitio queda protegido con una **contraseña temporal** hasta que lo "reclames", y un sitio no
   reclamado puede borrarse en poco tiempo (alrededor de una hora): la tablet pediría contraseña o quedaría instalada desde un sitio que desaparece.
2. Con la sesión iniciada, ir a `https://app.netlify.com/drop` y arrastrar la carpeta `app/`.
   Da una dirección `https://<nombre>.netlify.app`.
3. Revisar que el proyecto sea **público**: en los planes nuevos puede estar activado "privado por defecto"
   (el sitio sólo lo ve tu equipo). Prueba fácil: abrir la dirección en una **ventana privada/incógnito**;
   tiene que abrir Colorinche sin pedir usuario ni contraseña.
4. Recién ahí abrirla en la tablet.
5. Para actualizar: correr el paso 0 y, en el panel del proyecto, arrastrar de nuevo la carpeta `app/` a la
   zona de *Production deploys*.

### Otros hostings (Cloudflare Pages, Vercel, Firebase…)

También sirven, siempre que sean **https** y públicos. Varios redirigen `/index.html` → `/` ("URLs lindas");
Colorinche ya lo tiene en cuenta (guarda la página final, sin la redirección), pero conviene probarlo una vez:
abrir la dirección con internet, esperar unos 15 segundos, activar el **modo avión** y volver a abrirla (también
`.../index.html`). Tiene que abrir igual. Si sólo abre con internet, no la instales ahí y avisá.
Si en el mismo dominio publicás dos copias (p. ej. `.../colorinche/` y `.../colorinche-prueba/`), cada una guarda
lo suyo por separado y no se molestan.

### Instalar en la tablet

- **Android (Chrome)**: abrir la dirección → menú ⋮ → **Instalar app** (o "Agregar a la pantalla principal").
  Queda un ícono de Colorinche; abre a pantalla completa y funciona sin internet.
- **iPad / iPhone (Safari)**: abrir la dirección en **Safari** → botón Compartir → **Agregar a pantalla de
  inicio** → Agregar.
  **Importante en iPad/iPhone**: instalala primero y **usala siempre desde ese ícono, no desde Safari**.
  La app de la pantalla de inicio guarda sus datos aparte de Safari: lo que se pinte o suba en Safari
  no aparece en el ícono (y al revés). Además Safari puede borrar los datos de una página que no se usa
  por unos 7 días; la app agregada a la pantalla de inicio no tiene ese límite.
  (Es el comportamiento conocido de WebKit; no se pudo probar en un iPad real.)
- La primera vez tiene que abrirse **con internet** y quedar abierta **unos 15 segundos** antes de cortar
  internet: en ese rato descarga toda la app (~0,9 MB) y en pantalla no se nota cuándo terminó. Después anda
  sin internet.

### Actualizaciones en la tablet

La app instalada busca la versión nueva cada vez que **se abre de cero con internet**; se instala sola en
segundo plano y se usa desde la apertura siguiente. Si la app nunca se cierra del todo (sólo se reanuda
desde "recientes"), puede seguir con la versión vieja: **cerrala del todo desde recientes y abrila de nuevo
con internet** (a veces hay que hacerlo dos veces: una para descargar, otra para ver la versión nueva).
Los dibujos, fotos y obras guardadas no se pierden al actualizar.
