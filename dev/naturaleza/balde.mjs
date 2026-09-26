// Prueba del balde en la app real con dibujos de "naturaleza": toca varias zonas con colores distintos.
// Uso: cd dev && node naturaleza/balde.mjs
import { launch, appUrl, shot, tap } from '../lib.mjs';

const toques = {
  sol: [[500, 100], [500, 380], [500, 238], [900, 500], [355, 548], [500, 600], [120, 120]],
  arcoiris: [[500, 318], [500, 372], [500, 427], [500, 482], [500, 536], [500, 591], [162, 196], [232, 680], [768, 800], [500, 900]],
  arbol: [[460, 150], [230, 300], [420, 650], [450, 905], [780, 760], [770, 835], [880, 760], [625, 796], [920, 300]],
  mariposa: [[120, 362], [212, 322], [300, 830], [500, 560], [500, 400], [390, 124], [318, 472]],
  hongo: [[300, 200], [500, 176], [500, 590], [470, 800], [450, 905], [760, 700], [832, 682], [832, 860], [950, 300]],
};
const t = await launch({ size: 'tablet' });
for (const [id, pts] of Object.entries(toques)) {
  await t.page.goto(appUrl('colorear/' + id));
  await t.page.waitForTimeout(1500);
  // El lienzo visible más grande = la hoja de dibujo.
  const r = await t.page.evaluate(() => {
    const cs = [...document.querySelectorAll('.screen--colorear canvas')].map((c) => c.getBoundingClientRect())
      .filter((b) => b.width > 50).sort((a, b) => b.width * b.height - a.width * a.height);
    const b = cs[0]; return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
  const sw = await t.page.$$('.screen--colorear [aria-label]');
  let i = 0;
  for (const [x, y] of pts) {
    // Cambiar de color: tocar un círculo de la paleta distinto cada vez (si se encuentran).
    const colores = await t.page.$$('.screen--colorear .swatch, .screen--colorear [data-color]');
    if (colores.length) await colores[(i * 5 + 2) % colores.length].click();
    await tap(t.page, r.x + (x / 1000) * r.w, r.y + (y / 1000) * r.h);
    await t.page.waitForTimeout(250);
    i++;
  }
  await t.page.waitForTimeout(400);
  await shot(t.page, `naturaleza/tablet-balde-${id}`);
}
console.log('errores:', t.errors.length ? t.errors.join('\n') : 'ninguno');
await t.close();
