// Lista las zonas de cada dibujo de "naturaleza" (área y centro en coordenadas 0..1000),
// para encontrar zonas diminutas o tiras finas. Uso: cd dev && node naturaleza/zonas.mjs [id,id]
import path from 'node:path';
import { launch, fileUrl, DEV } from '../lib.mjs';

const ids = (process.argv[2] || 'sol,flor,arbol,mariposa,arcoiris,hongo').split(',');
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
for (const id of ids) {
  const out = await t.page.evaluate(async (id) => {
    const src = await raster(id);
    const W = src.width, H = src.height;
    const { label, sizes, n } = regions(src.getContext('2d', { willReadFrequently: true }), W, H);
    const acc = Array.from({ length: n }, () => ({ sx: 0, sy: 0, c: 0, x0: 1e9, y0: 1e9, x1: 0, y1: 0 }));
    for (let p = 0; p < W * H; p++) {
      const l = label[p]; if (l < 0) continue;
      const a = acc[l], x = p % W, y = (p / W) | 0;
      a.sx += x; a.sy += y; a.c++;
      if (x < a.x0) a.x0 = x; if (x > a.x1) a.x1 = x; if (y < a.y0) a.y0 = y; if (y > a.y1) a.y1 = y;
    }
    const k = 1000 / W;
    return acc.map((a, i) => ({
      i, area: +(a.c * k * k).toFixed(0), cx: Math.round(a.sx / a.c * k), cy: Math.round(a.sy / a.c * k),
      w: Math.round((a.x1 - a.x0) * k), h: Math.round((a.y1 - a.y0) * k),
    }));
  }, id);
  console.log(`\n== ${id}: ${out.length} zonas`);
  for (const z of out.sort((a, b) => a.area - b.area)) {
    const tag = z.area < 400 ? 'DIMINUTA' : z.area < 2500 ? 'chica' : '';
    console.log(`  #${z.i} área ${z.area} centro (${z.cx},${z.cy}) caja ${z.w}x${z.h} ${tag}`);
  }
}
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
