// Prueba de los dibujos del mar dentro de la app (catálogo y pantalla de colorear).
//   cd dev && node mar/app.mjs
// Capturas en dev/shots/mar/.
import { launch, appUrl, shot, tap, settle } from '../lib.mjs';
import { TOQUES as NUEVOS } from './toques.mjs';

const IDS = ['ballena', 'pulpo', 'tiburon', 'cangrejo', 'estrella-de-mar', 'caballito-de-mar',
  'delfin', 'medusa', 'foca', 'pez-payaso', 'tortuga-marina'];
// Puntos para tocar con el balde (coordenadas del lienzo 1000 × 1000) en cada dibujo.
const TOQUES = {
  ballena: [[450, 450], [300, 740], [396, 200], [880, 300]],
  pulpo: [[500, 250], [150, 520], [470, 800], [610, 170]],
  tiburon: [[500, 430], [520, 660], [505, 240], [920, 340]],
  cangrejo: [[500, 520], [160, 260], [420, 212], [150, 560]],
  'estrella-de-mar': [[500, 360], [500, 150], [150, 420], [720, 830]],
  'caballito-de-mar': [[600, 500], [395, 620], [712, 895], [400, 345]],
  // Dibujos nuevos: los mismos toques que mar/nuevos.mjs (sin el color).
  ...Object.fromEntries(Object.entries(NUEVOS).map(([id, pts]) => [id, pts.map(([x, y]) => [x, y])])),
};
const errores = [];

for (const size of ['desktop', 'tablet', 'phone', 'phoneH']) {
  const t = await launch({ size });
  const { page } = t;

  await page.goto(appUrl('dibujos/mar'));
  await page.waitForFunction(() => window.CL && CL.drawings && CL.drawings.list('mar').length > 0);
  if (size === 'desktop') {
    const info = await page.evaluate(() => CL.drawings.list('mar').map((d) => {
      const svg = CL.drawings.svg(d.id);
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      return { id: d.id, nombre: d.name, bytes: d.inner.replace(/\s+/g, ' ').length, ok: !doc.querySelector('parsererror') };
    }));
    console.log('registro:', JSON.stringify(info));
    const ids = info.map((d) => d.id).join(',');
    if (ids !== IDS.join(',')) errores.push('ids inesperados: ' + ids);
    for (const d of info) {
      if (!d.ok) errores.push('SVG inválido: ' + d.id);
      if (d.bytes > 6000) errores.push(`SVG grande (${d.bytes} B): ${d.id}`);
    }
  }
  await settle(page, 900);
  await shot(page, `mar/${size}-catalogo`);

  const lista = size === 'desktop' ? IDS : size === 'tablet' ? ['pulpo', 'caballito-de-mar', 'medusa'] : ['cangrejo', 'tortuga-marina'];
  for (const id of lista) {
    await page.goto(appUrl('colorear/' + id));
    await settle(page, 1500);
    // Lienzo más grande de la pantalla de colorear; el dibujo va centrado y cuadrado adentro.
    const r = await page.evaluate(() => {
      const cs = [...document.querySelectorAll('.screen--colorear canvas')]
        .map((c) => c.getBoundingClientRect()).filter((b) => b.width > 0);
      cs.sort((a, b) => b.width * b.height - a.width * a.height);
      return cs[0] ? { x: cs[0].x, y: cs[0].y, w: cs[0].width, h: cs[0].height } : null;
    });
    if (r) {
      const lado = Math.min(r.w, r.h);
      const ox = r.x + (r.w - lado) / 2, oy = r.y + (r.h - lado) / 2;
      const pointer = t.size.touch ? 'touch' : 'mouse';
      for (const [x, y] of TOQUES[id]) {
        await tap(page, ox + (x / 1000) * lado, oy + (y / 1000) * lado, { pointer });
        await settle(page, 450);
      }
      await settle(page, 600);
    } else errores.push(`${size}/${id}: no encontré el lienzo`);
    await shot(page, `mar/${size}-colorear-${id}`);
  }
  // Se ignoran errores de OTROS archivos de dibujos (otros agentes los editan en paralelo) y los íconos PWA.
  const propios = t.errors.filter((e) => !/js\/drawings\/(?!mar\.js)[a-z-]+\.js/.test(e) && !/icons\/.*\.png/.test(e));
  console.log(`${size}: errores de consola: ${propios.length}` + (propios.length ? '\n  ' + propios.join('\n  ') : ''));
  errores.push(...propios.map((e) => `${size}: ${e}`));
  await t.close();
}
// El pulpo original pesa ~8,7 KB (ya era así antes de agregar los dibujos nuevos): se avisa, no es falla nueva.
console.log(errores.length ? 'FALLAS:\n' + errores.join('\n') : 'OK');
