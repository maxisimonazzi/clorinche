// Prueba de los dibujos de la selva dentro de la app (catálogo y pantalla de colorear).
//   cd dev && node selva/app.mjs
// Capturas en dev/shots/selva/.
import { launch, appUrl, shot, tap, settle } from '../lib.mjs';

const IDS = ['leon', 'elefante', 'jirafa', 'mono', 'cebra', 'cocodrilo'];
// Puntos para tocar con el balde (coordenadas del lienzo 1000 × 1000) en cada dibujo.
const TOQUES = {
  leon: [[500, 300], [250, 380], [330, 815]],
  elefante: [[500, 330], [240, 400], [440, 800]],
  jirafa: [[400, 720], [660, 200], [616, 463]],
  mono: [[500, 250], [500, 760], [760, 625]],
  cebra: [[618, 560], [505, 228], [182, 354], [420, 416]],
  cocodrilo: [[300, 580], [420, 730], [490, 490]],
};
const errores = [];

for (const size of ['desktop', 'tablet', 'phone', 'phoneH']) {
  const t = await launch({ size });
  const { page } = t;

  await page.goto(appUrl('dibujos/selva'));
  await page.waitForFunction(() => window.CL && CL.drawings && CL.drawings.list('selva').length > 0);
  if (size === 'desktop') {
    const info = await page.evaluate(() => CL.drawings.list('selva').map((d) => {
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
  await shot(page, `selva/${size}-catalogo`);

  const lista = size === 'desktop' || size === 'tablet' ? IDS : ['cebra', 'cocodrilo', 'mono'];
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
        await settle(page, 250);
      }
      await settle(page, 600);
    } else errores.push(`${size}/${id}: no encontré el lienzo`);
    await shot(page, `selva/${size}-colorear-${id}`);
  }
  if (t.errors.length) console.log(size, 'errores de consola:\n  ' + t.errors.join('\n  '));
  await t.close();
}
console.log(errores.length ? 'FALLAS:\n' + errores.join('\n') : 'OK');
