// (Corrección 1) Abre los dibujos de vehículos dentro de la app (catálogo y pantalla de colorear) en 3 tamaños,
// toca el balde en algunas zonas y saca capturas en dev/shots/vehiculos/.
import { launch, appUrl, shot, settle, tap } from '../lib.mjs';

const ids = ['colectivo', 'camion-bomberos', 'tren', 'avion', 'cohete', 'auto'];
const errores = [];
for (const size of ['desktop', 'tablet', 'phone']) {
  const t = await launch({ size });
  const p = t.page;
  await p.goto(appUrl('dibujos/vehiculos'));
  await settle(p, 900);
  await shot(p, `vehiculos/fix1/app-${size}-catalogo`);
  for (const id of (size === "desktop" ? ids : size === "tablet" ? ["colectivo", "camion-bomberos", "cohete"] : ["colectivo", "tren", "avion"])) {
    await p.goto(appUrl('colorear/' + id));
    await settle(p, 1200);
    // Unos toques de balde en el centro del lienzo (donde cae el vehículo).
    const c = await p.evaluate(() => {
      const cv = [...document.querySelectorAll('canvas')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
      if (!cv) return null;
      const r = cv.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    if (c) {
      for (const [fx, fy] of [[0.5, 0.55], [0.3, 0.6], [0.7, 0.45], [0.5, 0.3]]) {
        await tap(p, c.x + c.w * fx, c.y + c.h * fy, { pointer: size === 'desktop' ? 'mouse' : 'touch' });
        await settle(p, 150);
      }
    }
    await settle(p, 400);
    await shot(p, `vehiculos/fix1/app-${size}-${id}`);
  }
  errores.push(...t.errors.map((e) => `[${size}] ${e}`));
  await t.close();
}
console.log(errores.length ? 'ERRORES:\n' + errores.join('\n') : 'sin errores');
