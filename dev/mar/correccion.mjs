// Corrección 1 de "mar": cada dibujo en la pantalla de colorear (sin pintar y con unos toques de
// balde) en desktop, tablet y phone.   cd dev && node mar/correccion.mjs
// Capturas en dev/shots/mar/correccion/.
import { launch, appUrl, shot, tap, settle } from '../lib.mjs';

const IDS = ['ballena', 'pulpo', 'tiburon', 'cangrejo', 'estrella-de-mar', 'caballito-de-mar'];
// Toques de balde (coordenadas del lienzo 1000 × 1000).
const TOQUES = {
  ballena: [[450, 450], [300, 700], [610, 800], [880, 300]],
  pulpo: [[500, 250], [160, 420], [230, 700], [440, 700], [140, 340]],
  tiburon: [[500, 430], [520, 660], [900, 360], [900, 640]],
  cangrejo: [[500, 520], [160, 260], [402, 200], [416, 380]],
  'estrella-de-mar': [[500, 360], [500, 150], [368, 566], [720, 830]],
  'caballito-de-mar': [[600, 500], [440, 470], [420, 640], [820, 520], [700, 80]],
};
const errores = [];
for (const size of ['desktop', 'tablet', 'phone']) {
  const t = await launch({ size });
  const { page } = t;
  for (const id of IDS) {
    await page.goto(appUrl('colorear/' + id));
    await settle(page, 1200);
    const r = await page.evaluate(() => {
      const cs = [...document.querySelectorAll('.screen--colorear canvas')]
        .map((c) => c.getBoundingClientRect()).filter((b) => b.width > 0);
      cs.sort((a, b) => b.width * b.height - a.width * a.height);
      return cs[0] ? { x: cs[0].x, y: cs[0].y, w: cs[0].width, h: cs[0].height } : null;
    });
    if (!r) { errores.push(`${size}/${id}: no encontré el lienzo`); continue; }
    const lado = Math.min(r.w, r.h), ox = r.x + (r.w - lado) / 2, oy = r.y + (r.h - lado) / 2;
    for (const [x, y] of TOQUES[id]) {
      await tap(page, ox + (x / 1000) * lado, oy + (y / 1000) * lado, { pointer: t.size.touch ? 'touch' : 'mouse' });
      await settle(page, 350);
    }
    await settle(page, 500);
    console.log(await shot(page, `mar/correccion/${size}-${id}`));
  }
  errores.push(...t.errors.filter((e) => !/icons\/.*\.png/.test(e)).map((e) => `${size}: ${e}`));
  await t.close();
}
console.log(errores.length ? 'ERRORES:\n' + errores.join('\n') : 'sin errores');
