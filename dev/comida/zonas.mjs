// Lista las zonas chicas de cada dibujo (bloqueadas o apenas pintables), con su caja en unidades 0..1000
// y el "ancho útil" aproximado (2·área/perímetro de borde), para encontrar tiras finas y anillos diminutos.
//   node comida/zonas.mjs helado,torta,...
import path from 'node:path';
import { launch, fileUrl, DEV } from '../lib.mjs';

const ids = (process.argv[2] || '').split(',');
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
for (const id of ids) {
  const out = await t.page.evaluate(async (id) => {
    const src = await raster(id);
    const W = 2048, H = 2048, k = 1000 / 2048;
    const { label, sizes, n, wall } = regions(src.getContext('2d', { willReadFrequently: true }), W, H);
    const bg = label[2 * W + 2];
    const bb = Array.from({ length: n }, () => ({ x0: 1e9, y0: 1e9, x1: -1, y1: -1, edge: 0 }));
    for (let p = 0; p < W * H; p++) {
      const l = label[p]; if (l < 0) continue;
      const x = p % W, y = (p / W) | 0, b = bb[l];
      if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
      if ((x > 0 && wall[p - 1]) || (x < W - 1 && wall[p + 1]) || (y > 0 && wall[p - W]) || (y < H - 1 && wall[p + W])) b.edge++;
    }
    const res = [];
    for (let i = 0; i < n; i++) {
      if (i === bg) continue;
      const area = sizes[i] * k * k; // u²
      const ancho = (2 * sizes[i] / Math.max(1, bb[i].edge)) * k; // ancho medio aprox. en u
      if (area < 4000 || ancho < 30) res.push({
        area: Math.round(area), ancho: Math.round(ancho), bloqueada: sizes[i] < 0.0004 * W * H,
        caja: [bb[i].x0, bb[i].y0, bb[i].x1, bb[i].y1].map((v) => Math.round(v * k)),
      });
    }
    return res;
  }, id);
  console.log('\n== ' + id);
  for (const z of out) console.log(JSON.stringify(z));
}
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
