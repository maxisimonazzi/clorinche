// Lista las zonas pintables chicas de los dibujos de dinosaurios (para detectar tiras finas o zonas diminutas).
//   cd dev && node selva/zonas.mjs [id,id...]
// Imprime cada zona con área < UMBRAL (en u² del lienzo 1000×1000), su centro y su caja.
import path from 'node:path';
import { launch, fileUrl, DEV } from '../lib.mjs';

const UMBRAL = 3500; // ~ 60 × 60 u
const ids = (process.argv[2] || 'trex,triceratops,diplodocus,estegosaurio,pterodactilo').split(',');
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
for (const id of ids) {
  const r = await t.page.evaluate(async ([id, UMBRAL]) => {
    const c = await raster(id);
    const W = c.width, H = c.height, k = 1000 / W;
    const { label, sizes, n } = regions(c.getContext('2d'), W, H);
    const bg = label[2 * W + 2];
    const box = Array.from({ length: n }, () => ({ x0: 1e9, y0: 1e9, x1: -1, y1: -1, sx: 0, sy: 0 }));
    for (let p = 0; p < W * H; p++) {
      const l = label[p]; if (l < 0) continue;
      const x = p % W, y = (p / W) | 0, b = box[l];
      if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
      b.sx += x; b.sy += y;
    }
    const minArea = 0.0004 * W * H;
    const out = [];
    for (let i = 0; i < n; i++) {
      if (i === bg) continue;
      const a = sizes[i] * k * k;
      if (a >= UMBRAL) continue;
      const b = box[i];
      out.push({
        area: Math.round(a), bloqueada: sizes[i] < minArea,
        centro: [Math.round(b.sx / sizes[i] * k), Math.round(b.sy / sizes[i] * k)],
        caja: [Math.round((b.x1 - b.x0) * k), Math.round((b.y1 - b.y0) * k)],
      });
    }
    return out.sort((a, b) => a.area - b.area);
  }, [id, UMBRAL]);
  console.log(`\n${id}: ${r.length} zonas chicas`);
  for (const z of r) console.log(' ', JSON.stringify(z));
}
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
