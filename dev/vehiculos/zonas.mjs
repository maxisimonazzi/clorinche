// Análisis de zonas de los dibujos de vehículos (1 px = 1 u).
//   node vehiculos/zonas.mjs auto,tren
// Imprime márgenes de la tinta y cada zona chica o angosta: área, caja, diámetro inscripto máximo.
import path from 'node:path';
import { launch, fileUrl, DEV } from '../lib.mjs';

const ids = (process.argv[2] || 'auto,colectivo,camion-bomberos,tren,avion,cohete').split(',');
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
for (const id of ids) {
  const r = await t.page.evaluate(async (id) => {
    const W = 1000, N = W * W;
    const img = await CL.util.svgToImage(CL.drawings.svg(id, W));
    const c = CL.util.canvas(W, W); const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, W); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, W, W).data;
    const wall = new Uint8Array(N);
    let ix0 = W, ix1 = 0, iy0 = W, iy1 = 0;
    for (let i = 0; i < N; i++) {
      if (d[i * 4] * .299 + d[i * 4 + 1] * .587 + d[i * 4 + 2] * .114 < 150) {
        wall[i] = 1; const x = i % W, y = (i / W) | 0;
        if (x < ix0) ix0 = x; if (x > ix1) ix1 = x; if (y < iy0) iy0 = y; if (y > iy1) iy1 = y;
      }
    }
    // Distancia (chamfer 3-4) a la pared.
    const dist = new Float32Array(N);
    for (let i = 0; i < N; i++) dist[i] = wall[i] ? 0 : 1e9;
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!dist[i]) continue; let v = dist[i];
      if (x > 0) v = Math.min(v, dist[i - 1] + 1);
      if (y > 0) { v = Math.min(v, dist[i - W] + 1); if (x > 0) v = Math.min(v, dist[i - W - 1] + 1.414); if (x < W - 1) v = Math.min(v, dist[i - W + 1] + 1.414); }
      dist[i] = v;
    }
    for (let y = W - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x; if (!dist[i]) continue; let v = dist[i];
      if (x < W - 1) v = Math.min(v, dist[i + 1] + 1);
      if (y < W - 1) { v = Math.min(v, dist[i + W] + 1); if (x < W - 1) v = Math.min(v, dist[i + W + 1] + 1.414); if (x > 0) v = Math.min(v, dist[i + W - 1] + 1.414); }
      dist[i] = v;
    }
    const lab = new Int32Array(N).fill(-1); const st = new Int32Array(N); const out = []; let n = 0;
    for (let p = 0; p < N; p++) {
      if (wall[p] || lab[p] >= 0) continue;
      let sp = 0, cnt = 0, x0 = W, x1 = -1, y0 = W, y1 = -1, md = 0, border = false;
      st[sp++] = p; lab[p] = n;
      while (sp) {
        const q = st[--sp]; cnt++; const x = q % W, y = (q / W) | 0;
        if (dist[q] > md) md = dist[q];
        if (x === 0 || y === 0 || x === W - 1 || y === W - 1) border = true;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x > 0 && !wall[q - 1] && lab[q - 1] < 0) { lab[q - 1] = n; st[sp++] = q - 1; }
        if (x < W - 1 && !wall[q + 1] && lab[q + 1] < 0) { lab[q + 1] = n; st[sp++] = q + 1; }
        if (y > 0 && !wall[q - W] && lab[q - W] < 0) { lab[q - W] = n; st[sp++] = q - W; }
        if (y < W - 1 && !wall[q + W] && lab[q + W] < 0) { lab[q + W] = n; st[sp++] = q + W; }
      }
      if (!border) out.push({ cnt, x0, x1, y0, y1, dia: Math.round(md * 2) });
      n++;
    }
    const flag = out.filter((o) => o.cnt < 2500 || o.dia < 45);
    return {
      ink: `x ${ix0}-${ix1}  y ${iy0}-${iy1}  márgenes L${ix0} R${W - 1 - ix1} T${iy0} B${W - 1 - iy1}`,
      zonas: out.length,
      flag: flag.map((o) => `${o.cnt}u² [${o.x0}-${o.x1}]x[${o.y0}-${o.y1}] Ø${o.dia}`),
    };
  }, id);
  console.log(`\n== ${id}: ${r.zonas} zonas; ${r.ink}`);
  for (const f of r.flag) console.log('   ' + f);
}
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
