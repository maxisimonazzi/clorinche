# Colorinche 🎨

App web para chicos de 3 a 8 años para colorear y dibujar, pensada para tablet, celular y compu.
Estática (HTML + CSS + JavaScript, sin backend ni dependencias), toda en español, instalable (PWA) y sin internet.

- **Colorear**: 53 dibujos propios en SVG en 9 categorías + "Mis dibujos" (imágenes subidas). Balde, pincel con
  "no salirse de las líneas", goma, deshacer/rehacer, zoom (pellizco, rueda y botones), 24 colores, selector de
  cualquier color y rellenos especiales (arcoíris, degradé, brillitos, lunares). Autoguardado y "¡Terminé!".
- **Subir imágenes**: desde archivo o cámara; se limpian a blanco y negro puro con umbral ajustable y vista previa
  (modo página de colorear y modo foto), se achican y quedan en "Mis dibujos".
- **Pizarra mágica**: lápiz, fibra, pincel, crayón, aerosol, marcador arcoíris, brillitos, sellos y goma; 4 grosores,
  fondos (blanco, colores, pizarrón) y "Borrar todo" con la barrita que se desliza.
- **Neón**: trazos que brillan, colores neón + arcoíris, espejo/caleidoscopio de 2, 4, 6 u 8 ejes.
- **Fuegos artificiales**: cada trazo es una mecha que se consume y explota (9 tipos de explosión), con multitouch.
- **Mis obras**: galería con miniaturas grandes; seguir, descargar PNG o borrar (manteniendo apretado).

Todo se guarda en el navegador (IndexedDB). Para borrar cualquier cosa hay que mantener apretado el botón.

## Abrirla en la compu

Doble clic en `app/index.html` (probada en Edge; Chrome usa el mismo motor). Funciona todo; lo único que no hay por `file://` es la
instalación como app. Para instalarla en la compu: `cd dev && node serve.mjs` y abrir `http://localhost:8765/`
→ ícono "Instalar" en la barra de direcciones.

## Instalarla en una tablet o celular

Necesita estar publicada en **https**: subir el **contenido** de `app/` a GitHub Pages o Netlify (gratis) y, en la
tablet, abrir la dirección → **Instalar app** (Android/Chrome) o **Compartir → Agregar a pantalla de inicio**
(iPad/iPhone/Safari). La primera vez abrila con internet unos 15 segundos; después anda sin internet.
Paso a paso completo, actualizaciones y detalles de iPad: [dev/pwa/PUBLICAR.md](dev/pwa/PUBLICAR.md).

**Antes de publicar cambios** (si se toca algo de `app/`): `cd dev && node build-sw.mjs` — si no, las tablets
que ya la instalaron no reciben la versión nueva.

## Estructura

```
app/     la app (esto es lo que se abre o se publica)
dev/     herramientas de verificación (Playwright + Edge headless), no se publican
         ARQUITECTURA.md       contratos entre módulos y reglas de los dibujos
         hoja-control.mjs      hoja de control: todos los dibujos con zonas pintadas al azar
         drawings/preview.mjs  vista previa de dibujos por categoría o individual
         e2e/flujo.mjs         punta a punta: subir → pintar → recargar → terminar → galería → pizarra
         integracion/*.mjs     capturas de todas las pantallas, neón y fuegos en plena animación
         pwa/pwa-test.mjs      prueba de instalación y funcionamiento sin internet
```

Para correr las pruebas: `cd dev && npm install` (una vez) y, por ejemplo, `node hoja-control.mjs`,
`node e2e/flujo.mjs tablet` o `node pwa/pwa-test.mjs desktop,tablet,phone --strict`. Las capturas quedan en `dev/shots/`.

Fuente: Fredoka (SIL Open Font License, `app/fonts/OFL.txt`).
