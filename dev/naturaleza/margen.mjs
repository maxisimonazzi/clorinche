// Naturaleza: caja de la tinta de cada dibujo (para chequear el margen >= 40 u).
import path from 'node:path';
import { launch, fileUrl, DEV } from '../lib.mjs';
const ids = (process.argv[2] || 'sol,flor,arbol,mariposa,arcoiris,hongo').split(',');
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
for (const id of ids) {
  const r = await t.page.evaluate(async (id) => {
    const c = await raster(id); const W = RES, k = W / 1000;
    const d = c.getContext('2d').getImageData(0, 0, W, W).data;
    let x0 = W, y0 = W, x1 = 0, y1 = 0;
    for (let p = 0; p < W * W; p++) if (d[p * 4] < 128) { const x = p % W, y = (p / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const u = (v) => Math.round(v / k);
    return { izq: u(x0), arriba: u(y0), der: 1000 - u(x1), abajo: 1000 - u(y1) };
  }, id);
  console.log(id, 'margen (u):', JSON.stringify(r));
}
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
