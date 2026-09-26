// Lista las zonas diminutas (bloqueadas) de cada dibujo de mascotas con su posición, para revisar que
// sólo sean brillitos de ojos o rincones invisibles.  Uso: cd dev && node mascotas/tiny.mjs [id]
import path from 'node:path';
import { launch, fileUrl, DEV } from '../lib.mjs';
const only = process.argv[2];
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
const out = await t.page.evaluate(async (only) => {
  const RES = 1000, res = {};
  for (const d of CL.drawings.list('mascotas')) {
    if (only && d.id !== only) continue;
    const img = await CL.util.svgToImage(CL.drawings.svg(d.id, RES));
    const c = CL.util.canvas(RES, RES); const x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#fff'; x.fillRect(0, 0, RES, RES); x.drawImage(img, 0, 0);
    const px = x.getImageData(0, 0, RES, RES).data, N = RES * RES;
    const wall = new Uint8Array(N);
    for (let i = 0; i < N; i++) wall[i] = (px[i*4]*0.299 + px[i*4+1]*0.587 + px[i*4+2]*0.114) < 150 ? 1 : 0;
    const lab = new Int32Array(N).fill(-1), st = new Int32Array(N), info = [];
    let n = 0;
    for (let p = 0; p < N; p++) {
      if (wall[p] || lab[p] >= 0) continue;
      let sp = 0, cnt = 0, sx = 0, sy = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; st[sp++] = p; lab[p] = n;
      while (sp) { const q = st[--sp]; cnt++; const X = q % RES, Y = (q / RES) | 0; sx += X; sy += Y;
        x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
        for (const r of [q - 1, q + 1, q - RES, q + RES]) { if (r < 0 || r >= N) continue; if (Math.abs((r % RES) - X) > 1) continue; if (!wall[r] && lab[r] < 0) { lab[r] = n; st[sp++] = r; } } }
      info.push({ n, area: cnt, cx: Math.round(sx / cnt), cy: Math.round(sy / cnt), w: x1 - x0 + 1, h: y1 - y0 + 1 }); n++;
    }
    res[d.id] = info.filter((z) => z.area < 2500).sort((a, b) => a.area - b.area);
  }
  return res;
}, only);
for (const [id, zs] of Object.entries(out)) {
  console.log(id);
  for (const z of zs) console.log(`  area ${z.area}  en (${z.cx},${z.cy})  ${z.w}x${z.h}${z.area < 400 ? '  [bloqueada]' : ''}`);
}
await t.close();
