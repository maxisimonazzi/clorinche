// Prueba de los dibujos de dinosaurios dentro de la app (catálogo y pantalla de colorear).
//   cd dev && node dinosaurios/app.mjs
// Capturas en dev/shots/dinosaurios/.
import { launch, appUrl, shot, tap, settle } from '../lib.mjs';

const IDS = ['trex', 'triceratops', 'diplodocus', 'estegosaurio', 'pterodactilo'];
// Puntos para tocar con el balde (coordenadas del lienzo 1000 × 1000) en cada dibujo.
const TOQUES = {
  trex: [[760, 250], [380, 720], [200, 620], [600, 820]],
  triceratops: [[420, 700], [530, 400], [840, 500], [240, 860]],
  diplodocus: [[520, 680], [600, 520], [850, 150], [250, 450]],
  estegosaurio: [[520, 700], [505, 380], [880, 740], [200, 620]],
  pterodactilo: [[440, 540], [380, 560], [450, 340], [700, 280]],
};
const errores = [];

for (const size of ['desktop', 'tablet', 'phone', 'phoneH']) {
  const t = await launch({ size });
  const { page } = t;

  await page.goto(appUrl('dibujos/dinosaurios'));
  await page.waitForFunction(() => window.CL && CL.drawings && CL.drawings.list('dinosaurios').length > 0);
  if (size === 'desktop') {
    const info = await page.evaluate(() => CL.drawings.list('dinosaurios').map((d) => {
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
  await shot(page, `dinosaurios/${size}-catalogo`);

  const lista = size === 'desktop' ? IDS : size === 'tablet' ? ['trex', 'estegosaurio'] : ['triceratops'];
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
    await shot(page, `dinosaurios/${size}-colorear-${id}`);
  }
  if (t.errors.length) console.log(size, 'errores de consola:\n  ' + t.errors.join('\n  '));
  await t.close();
}
console.log(errores.length ? 'FALLAS:\n' + errores.join('\n') : 'OK');
