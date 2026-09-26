// Análisis de zonas de los dibujos de mascotas: área (u²), grosor máximo (diámetro inscripto, u) y bbox.
//   cd dev && node mascotas/zonas.mjs perro,gato   (sin args: toda la categoría; RES=2048 para buscar agujeritos de 1 px)
// Marca con "!!" las zonas chicas (área < 2025 u² o grosor < 45 u) que no son diminutas (brillitos).
import path from 'node:path';
import { launch, fileUrl, DEV } from '../lib.mjs';
const arg = process.argv[2];
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
const ids = arg ? arg.split(',') : await t.page.evaluate(() => CL.drawings.list('mascotas').map((d) => d.id));
for (const id of ids) {
  const r = await t.page.evaluate(async ([id, R]) => {
    const N = R * R, K = 1000 / R;
    const img = await CL.util.svgToImage(CL.drawings.svg(id, R));
    const c = CL.util.canvas(R, R); const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, R, R); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, R, R).data;
    const wall = new Uint8Array(N);
    for (let i = 0; i < N; i++) wall[i] = (d[i*4]*.299 + d[i*4+1]*.587 + d[i*4+2]*.114) < 150;
    // distancia chamfer 3-4 a la pared
    const dist = new Float32Array(N);
    for (let i = 0; i < N; i++) dist[i] = wall[i] ? 0 : 1e9;
    for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) { const i = y*R+x; if (!dist[i]) continue; let v = dist[i];
      if (x > 0) v = Math.min(v, dist[i-1] + 3); if (y > 0) { v = Math.min(v, dist[i-R] + 3); if (x > 0) v = Math.min(v, dist[i-R-1] + 4); if (x < R-1) v = Math.min(v, dist[i-R+1] + 4); } dist[i] = v; }
    for (let y = R-1; y >= 0; y--) for (let x = R-1; x >= 0; x--) { const i = y*R+x; if (!dist[i]) continue; let v = dist[i];
      if (x < R-1) v = Math.min(v, dist[i+1] + 3); if (y < R-1) { v = Math.min(v, dist[i+R] + 3); if (x < R-1) v = Math.min(v, dist[i+R+1] + 4); if (x > 0) v = Math.min(v, dist[i+R-1] + 4); } dist[i] = v; }
    const lab = new Int32Array(N).fill(-1); const st = new Int32Array(N); const out = []; let n = 0;
    for (let p = 0; p < N; p++) { if (wall[p] || lab[p] >= 0) continue;
      let sp = 0, cnt = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, md = 0; st[sp++] = p; lab[p] = n;
      while (sp) { const q = st[--sp]; cnt++; const x = q % R, y = (q / R) | 0; md = Math.max(md, dist[q]);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        if (x > 0 && !wall[q-1] && lab[q-1] < 0) { lab[q-1] = n; st[sp++] = q-1; }
        if (x < R-1 && !wall[q+1] && lab[q+1] < 0) { lab[q+1] = n; st[sp++] = q+1; }
        if (y > 0 && !wall[q-R] && lab[q-R] < 0) { lab[q-R] = n; st[sp++] = q-R; }
        if (y < R-1 && !wall[q+R] && lab[q+R] < 0) { lab[q+R] = n; st[sp++] = q+R; } }
      out.push({ area: Math.round(cnt * K * K), grosor: Math.round(2 * md / 3 * K), bbox: [x0, y0, x1, y1].map((v) => Math.round(v * K)) }); n++; }
    return out.sort((a, b) => a.area - b.area);
  }, [id, Number(process.env.RES || 1000)]);
  console.log(`== ${id}: ${r.length} zonas`);
  for (const z of r) {
    const tiny = z.area < 400; // brillitos (< 0,04 %)
    const bad = !tiny && (z.area < 2025 || z.grosor < 45);
    if (z.area > 60000) continue;
    console.log(`${bad ? '!!' : '  '} ${String(z.area).padStart(6)} u²  grosor ${String(z.grosor).padStart(3)}  bbox ${z.bbox.join(',')}${tiny ? '  (diminuta)' : ''}`);
  }
}
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
