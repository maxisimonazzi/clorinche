// Mide los dibujos del mar: caja que ocupa el dibujo (márgenes en unidades del lienzo 1000)
// y las zonas pintables más chicas (en u², y su caja).
//   cd dev && node mar/medir.mjs [ids separados por coma]
import path from 'node:path';
import { launch, fileUrl, DEV } from '../lib.mjs';

const ids = (process.argv[2] || 'ballena,pulpo,tiburon,cangrejo,estrella-de-mar,caballito-de-mar').split(',');
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
for (const id of ids) {
  const r = await t.page.evaluate(async (id) => {
    const W = 2048, k = 1000 / W;
    const src = await raster(id);
    const ctx = src.getContext('2d', { willReadFrequently: true });
    const { label, sizes } = regions(ctx, W, W);
    const d = ctx.getImageData(0, 0, W, W).data;
    let x0 = W, y0 = W, x1 = 0, y1 = 0;
    for (let p = 0; p < W * W; p++) {
      if (d[p * 4] < 150) {
        const x = p % W, y = (p / W) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    const bg = label[2 * W + 2], min = 0.0004 * W * W;
    const bb = sizes.map(() => [W, W, 0, 0]);
    for (let p = 0; p < W * W; p++) {
      const l = label[p]; if (l < 0) continue;
      const x = p % W, y = (p / W) | 0, b = bb[l];
      if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y;
    }
    const zonas = sizes.map((s, i) => ({ i, a: Math.round(s * k * k), b: bb[i].map((v) => Math.round(v * k)) }))
      .filter((z, i) => i !== bg && sizes[i] >= min).sort((a, b) => a.a - b.a);
    return {
      caja: [x0, y0, x1, y1].map((v) => Math.round(v * k)),
      margen: Math.round(Math.min(x0, y0, W - 1 - x1, W - 1 - y1) * k),
      chicas: zonas.slice(0, 5).map((z) => `${z.a}u² [${z.b.join(',')}]`),
      diminutas: sizes.map((s, i) => ({ s, i })).filter((z) => z.i !== bg && z.s < min)
        .map((z) => `${Math.round(z.s * k * k)}u²@${bb[z.i].slice(0, 2).map((v) => Math.round(v * k)).join(',')}`),
    };
  }, id);
  console.log(id.padEnd(18), 'caja', JSON.stringify(r.caja), 'margen', r.margen, '| más chicas:', r.chicas.join('  '));
  console.log('   diminutas:', r.diminutas.join(' '));
}
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
