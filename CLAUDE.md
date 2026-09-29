# Colorinche — reglas para Claude

La app ya está estable y pulida. **Ahorrar tokens pesa más que verificar de más.** Contexto técnico en
`dev/ARQUITECTURA.md`; uso y publicación en `README.md`.

## Verificación: mínima por defecto

- Después de un cambio, como mucho **una** corrida del script existente que corresponda (tabla de abajo), a
  **un** tamaño (`tablet`), mirando **1 o 2 capturas** como máximo. Si el cambio es trivial, no correr nada.
- Si el usuario dice "sin verificar", "no pruebes" o "lo pruebo yo": no correr nada.
- **Nada de** subagentes, revisiones, rondas de QA, medición de fps, pruebas de estrés ni de los 3 tamaños,
  salvo que el usuario lo pida explícitamente.
- **No crear scripts nuevos en `dev/`.** Usar los de la tabla. Si de verdad hace falta uno de un solo uso, va al
  scratchpad (no a `dev/`); si hace falta uno permanente, preguntar antes.
- Leer primero la salida de texto (estadísticas, `t.errors`). Mirar una imagen sólo si el texto no alcanza, y
  preferir un recorte (`--crop` / `zoom.mjs`) a una hoja entera.
- No leer archivos grandes enteros (los `app/js/drawings/*.js` tienen cientos de líneas): Grep + leer el tramo.
- No borrar capturas ni regenerar hojas "por las dudas".

## Al terminar una tarea: ofrecer (no correr) la verificación completa

Si la tarea cambió algo en `app/`, cerrar la respuesta con una pregunta así, adaptada al cambio:

> ¿Querés que corra la verificación completa? Sería: [lo concreto para este cambio, p. ej. "hoja de control de
> granja + flujo de punta a punta en desktop, tablet y celular + fps del pincel"]. Sirve para detectar
> [qué riesgo real tiene este cambio]. Gasta bastante (cada captura que miro son ~1.500 tokens; esto serían
> unas N). Si no, lo probás vos en la tablet.

Correrla **sólo si el usuario acepta**, siguiendo `dev/ARQUITECTURA.md` §7 bis. No ofrecerla si el cambio fue
sólo de documentación o de `dev/`.

## Scripts disponibles (`cd dev`)

| Para qué | Comando | Genera |
|---|---|---|
| Ver un dibujo | `node drawings/preview.mjs --id vaca` | `shots/drawings/single/vaca.png` + stats |
| Ver una categoría | `node drawings/preview.mjs granja` | `shots/drawings/granja.png` + stats |
| Zonas que se escapan | `node hoja-control.mjs granja` | `shots/hoja-control/granja.png` + avisos por dibujo |
| Núcleo arranca sin errores | `node core-smoke.mjs` | texto + 1 captura |
| Flujo completo | `node e2e/flujo.mjs tablet` | texto + capturas del recorrido |
| Una pantalla | `node integracion/pantallas.mjs tablet colorear` | `shots/integracion/...` |
| PWA / sin internet | `node pwa/pwa-test.mjs tablet` | texto + capturas offline |
| Antes de publicar | `node build-sw.mjs` | reescribe `app/sw.js` (obligatorio si cambió `app/`) |

Dibujos nuevos: iterar en la copia de trabajo (`dev/mar/mar-dev.js` + `node mar/dev.mjs ...`, mismo patrón en
otras categorías) y pasar a `app/js/drawings/` cuando quede bien.
