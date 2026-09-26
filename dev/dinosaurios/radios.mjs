// Dinosaurios: análisis de zonas (área, caja y radio inscripto) y recortes ampliados.
//   node dinosaurios/radios.mjs <id> [x0,y0,x1,y1 ...]   (coordenadas del lienzo 1000x1000)
// Imprime cada zona pintable con área (u²), bbox y "grosor" (radio máximo inscripto, en u).
// Guarda recortes (líneas | coloreado) ampliados en dev/shots/dinosaurios/zoom/<id>-<n>.png
import path from 'node:path';
import { launch, fileUrl, saveDataUrl, SHOTS, DEV } from '../lib.mjs';

const [id, ...crops] = process.argv.slice(2);
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
const r = await t.page.evaluate(async ({ id, crops }) => {
  const a = await analyze(id, 7);
  const W = RES, H = RES, S = W / 1000;
  const { label, sizes, n, wall } = regions(a.src.getContext('2d', { willReadFrequently: true }), W, H);
  // Distancia (chamfer 3-4) a la pared, para medir el grosor de cada zona.
  const dist = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) dist[p] = wall[p] ? 0 : 1e9;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x; if (!dist[p]) continue;
    let v = dist[p];
    if (x > 0) v = Math.min(v, dist[p - 1] + 3);
    if (y > 0) v = Math.min(v, dist[p - W] + 3);
    if (x > 0 && y > 0) v = Math.min(v, dist[p - W - 1] + 4);
    if (x < W - 1 && y > 0) v = Math.min(v, dist[p - W + 1] + 4);
    dist[p] = v;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const p = y * W + x; if (!dist[p]) continue;
    let v = dist[p];
    if (x < W - 1) v = Math.min(v, dist[p + 1] + 3);
    if (y < H - 1) v = Math.min(v, dist[p + W] + 3);
    if (x < W - 1 && y < H - 1) v = Math.min(v, dist[p + W + 1] + 4);
    if (x > 0 && y < H - 1) v = Math.min(v, dist[p + W - 1] + 4);
    dist[p] = v;
  }
  const info = [];
  for (let i = 0; i < n; i++) info.push({ i, area: sizes[i], x0: W, y0: H, x1: 0, y1: 0, md: 0 });
  for (let p = 0; p < W * H; p++) {
    const l = label[p]; if (l < 0) continue;
    const o = info[l], x = p % W, y = (p / W) | 0;
    if (x < o.x0) o.x0 = x; if (y < o.y0) o.y0 = y; if (x > o.x1) o.x1 = x; if (y > o.y1) o.y1 = y;
    if (dist[p] > o.md) o.md = dist[p];
  }
  const bg = label[2 * W + 2];
  const zonas = info.filter((o) => o.i !== bg).map((o) => ({
    area: Math.round(o.area / S / S), bbox: [o.x0, o.y0, o.x1, o.y1].map((v) => Math.round(v / S)),
    radio: Math.round(o.md / 3 / S), locked: o.area < MIN_AREA_FRAC * W * H,
  })).sort((p, q) => p.area - q.area);
  const pngs = crops.map((c) => {
    const [x0, y0, x1, y1] = c.split(',').map(Number);
    const w = (x1 - x0) * S, h = (y1 - y0) * S;
    const sc = Math.min(900 / w, 900 / h, 3);
    const cv = CL.util.canvas(Math.round(w * sc) * 2 + 30, Math.round(h * sc) + 20);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#f3f0ea'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(a.src, x0 * S, y0 * S, w, h, 10, 10, w * sc, h * sc);
    ctx.drawImage(a.colored, x0 * S, y0 * S, w, h, w * sc + 20, 10, w * sc, h * sc);
    return cv.toDataURL('image/png');
  });
  return { zonas, pngs };
}, { id, crops });
for (const z of r.zonas) console.log(JSON.stringify(z));
r.pngs.forEach((png, k) => console.log('->', saveDataUrl(png, path.join(SHOTS, 'dinosaurios', 'zoom', `${id}-${k + 1}.png`))));
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
