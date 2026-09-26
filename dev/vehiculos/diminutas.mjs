// Zonas diminutas (las que la app bloquea: < 0,04 % del lienzo) a la resolución real (2048 px),
// con su caja en unidades 0..1000. Sirve para encontrar huecos o pellizcos que no se ven a 1000 px.
//   node vehiculos/diminutas.mjs barco,bicicleta
import path from 'node:path';
import { launch, fileUrl, DEV } from '../lib.mjs';

const ids = (process.argv[2] || 'barco').split(',');
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
for (const id of ids) {
  const r = await t.page.evaluate(async (id) => {
    const W = 2048, N = W * W, k = 1000 / W;
    const img = await CL.util.svgToImage(CL.drawings.svg(id, W));
    const c = CL.util.canvas(W, W); const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, W); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, W, W).data;
    const wall = new Uint8Array(N);
    for (let i = 0; i < N; i++) wall[i] = d[i * 4] * .299 + d[i * 4 + 1] * .587 + d[i * 4 + 2] * .114 < 150 ? 1 : 0;
    const lab = new Int32Array(N).fill(-1); const st = new Int32Array(N); const out = []; let n = 0;
    for (let p = 0; p < N; p++) {
      if (wall[p] || lab[p] >= 0) continue;
      let sp = 0, cnt = 0, x0 = W, x1 = -1, y0 = W, y1 = -1;
      st[sp++] = p; lab[p] = n;
      while (sp) {
        const q = st[--sp]; cnt++; const x = q % W, y = (q / W) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x > 0 && !wall[q - 1] && lab[q - 1] < 0) { lab[q - 1] = n; st[sp++] = q - 1; }
        if (x < W - 1 && !wall[q + 1] && lab[q + 1] < 0) { lab[q + 1] = n; st[sp++] = q + 1; }
        if (y > 0 && !wall[q - W] && lab[q - W] < 0) { lab[q - W] = n; st[sp++] = q - W; }
        if (y < W - 1 && !wall[q + W] && lab[q + W] < 0) { lab[q + W] = n; st[sp++] = q + W; }
      }
      if (cnt < 0.0004 * N) out.push(`${Math.round(cnt * k * k)}u² [${Math.round(x0 * k)}-${Math.round(x1 * k)}]x[${Math.round(y0 * k)}-${Math.round(y1 * k)}]`);
      n++;
    }
    return { n, out };
  }, id);
  console.log(`== ${id}: ${r.n} regiones, ${r.out.length} diminutas`);
  for (const o of r.out) console.log('   ' + o);
}
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
