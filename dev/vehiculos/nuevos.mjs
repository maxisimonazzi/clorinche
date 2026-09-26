// Verifica en la app los 5 dibujos nuevos de vehículos (barco, helicóptero, bicicleta, moto y globo):
// catálogo de la categoría en tablet y celular (tienen que ser 11 dibujos) y la pantalla de colorear de
// dos de los nuevos, pintando con el balde varias zonas (un color distinto en cada toque).
// Capturas en dev/shots/vehiculos/nuevos/.   cd dev && node vehiculos/nuevos.mjs
import { launch, appUrl, shot, settle, tap } from '../lib.mjs';

// Puntos (en unidades del dibujo, 0..1000) donde toca el balde: uno por zona que interesa probar.
const toques = {
  barco: [
    [380, 400], [560, 400], [540, 132], [600, 596], [470, 720], [245, 712], [500, 832], [500, 896], [835, 190],
  ],
  'globo-aerostatico': [
    [500, 220], [230, 350], [300, 350], [700, 350], [770, 350], [500, 110], [500, 600], [500, 758], [440, 805], [150, 580],
  ],
};

const errores = [];
for (const size of ['tablet', 'phone']) {
  const t = await launch({ size });
  const p = t.page;
  await p.goto(appUrl('dibujos/vehiculos'));
  await settle(p, 1500);
  const items = await p.evaluate(() => [...document.querySelectorAll('.dj-item')].map((b) => b.getAttribute('aria-label')));
  console.log(`[${size}] catálogo: ${items.length} dibujos -> ${items.join(', ')}`);
  if (items.length !== 11) errores.push(`[${size}] el catálogo muestra ${items.length} dibujos (se esperaban 11)`);
  await shot(p, `vehiculos/nuevos/${size}-catalogo`);
  // En el celular, el final de la lista (donde están los nuevos).
  if (size === 'phone') {
    await p.evaluate(() => { const s = document.querySelector('.dj-scroll'); if (s) s.scrollTop = s.scrollHeight; });
    await settle(p, 600);
    await shot(p, `vehiculos/nuevos/${size}-catalogo-final`);
  }
  for (const [id, pts] of Object.entries(toques)) {
    await p.goto(appUrl('colorear/' + id));
    await settle(p, 1500);
    await shot(p, `vehiculos/nuevos/${size}-${id}-antes`);
    const r = await p.evaluate(() => {
      const b = document.querySelector('.cl-board').getBoundingClientRect();
      return { x: b.left, y: b.top, w: b.width, h: b.height, sw: document.querySelectorAll('.cl-sw:not(.cl-sp)').length };
    });
    for (let i = 0; i < pts.length; i++) {
      // Elegir un color distinto de la paleta y tocar la zona con el balde.
      // (sólo entre los colores que se ven: en el celular la paleta se desplaza de costado).
      const sw = await p.evaluate((i) => {
        const l = [...document.querySelectorAll('.cl-sw:not(.cl-sp)')].map((e) => e.getBoundingClientRect())
          .filter((q) => q.width && q.left >= 0 && q.right <= innerWidth && q.top >= 0 && q.bottom <= innerHeight);
        const q = l[(i * 5 + 1) % l.length];
        return { x: q.left + q.width / 2, y: q.top + q.height / 2 };
      }, i);
      await tap(p, sw.x, sw.y);
      await settle(p, 120);
      const [u, v] = pts[i];
      await tap(p, r.x + (r.w * u) / 1000, r.y + (r.h * v) / 1000);
      await settle(p, 250);
    }
    await settle(p, 500);
    await shot(p, `vehiculos/nuevos/${size}-${id}-pintado`);
    console.log(`[${size}] ${id}: ${pts.length} toques de balde (tablero ${Math.round(r.w)}×${Math.round(r.h)} px, ${r.sw} colores)`);
  }
  errores.push(...t.errors.map((e) => `[${size}] ${e}`));
  await t.close();
}
console.log(errores.length ? 'ERRORES:\n' + errores.join('\n') : 'sin errores');
