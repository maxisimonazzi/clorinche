// Caja de la tinta de cada dibujo (en unidades del lienzo 1000 × 1000) y tamaño del SVG.
//   cd dev && node dinosaurios/margen.mjs
import path from 'node:path';
import { launch, fileUrl, DEV } from '../lib.mjs';

const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
const r = await t.page.evaluate(async () => {
  const out = [];
  for (const d of CL.drawings.list('dinosaurios')) {
    const img = await CL.util.svgToImage(CL.drawings.svg(d.id, 1000));
    const c = CL.util.canvas(1000, 1000), ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1000, 1000); ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, 1000, 1000).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let p = 0; p < 1e6; p++) if (px[p * 4] < 128) {
      const x = p % 1000, y = (p / 1000) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    const doc = new DOMParser().parseFromString(CL.drawings.svg(d.id), 'image/svg+xml');
    out.push({ id: d.id, caja: [x0, y0, x1, y1], ancho: x1 - x0, alto: y1 - y0,
      margenMin: Math.min(x0, y0, 999 - x1, 999 - y1), bytes: d.inner.length, svgOk: !doc.querySelector('parsererror') });
  }
  return out;
});
for (const o of r) console.log(JSON.stringify(o));
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
