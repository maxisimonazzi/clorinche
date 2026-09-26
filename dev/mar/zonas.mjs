// Zonas de los dibujos de "mar" (basado en revision-mar/zonas.mjs; recortes en shots/mar/zonas).
//   node mar/zonas.mjs [ids]          -> tabla de zonas (todas las de "mar" o las ids dadas)
//   node mar/zonas.mjs --crop id x0 y0 x1 y1 [nombre]  -> recorte (coords en u 0..1000) líneas + color
import path from 'node:path';
import { launch, fileUrl, saveDataUrl, SHOTS, DEV } from '../lib.mjs';

const args = process.argv.slice(2);
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);

if (args[0] === '--crop') {
  const [, id, x0, y0, x1, y1, nombre] = args;
  const png = await t.page.evaluate(async ({ id, box }) => {
    const a = await analyze(id, 7);
    const k = 2048 / 1000;
    const [x0, y0, x1, y1] = box.map((v) => v * k);
    const w = x1 - x0, h = y1 - y0, s = Math.min(900 / w, 900 / h);
    const c = CL.util.canvas(Math.round(w * s) * 2 + 20, Math.round(h * s));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f3f0ea'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(a.src, x0, y0, w, h, 0, 0, w * s, h * s);
    ctx.drawImage(a.colored, x0, y0, w, h, w * s + 20, 0, w * s, h * s);
    return c.toDataURL('image/png');
  }, { id, box: [x0, y0, x1, y1].map(Number) });
  console.log(saveDataUrl(png, path.join(SHOTS, 'mar', 'zonas', (nombre || `${id}-${x0}-${y0}`) + '.png')));
} else {
  const ids = args[0] ? args[0].split(',') : await t.page.evaluate(() => CL.drawings.list('mar').map((d) => d.id));
  for (const id of ids) {
    const res = await t.page.evaluate(async (id) => {
      const W = 2048, H = 2048, k = 1000 / W;
      const src = await raster(id);
      const { label, sizes, n } = regions(src.getContext('2d', { willReadFrequently: true }), W, H);
      const bg = label[2 * W + 2];
      // Distancia (chamfer 3-4) de cada píxel de zona al borde de su zona.
      const D = new Float32Array(W * H);
      for (let p = 0; p < W * H; p++) D[p] = label[p] < 0 ? 0 : 1e9;
      const same = (p, q) => label[p] === label[q];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const p = y * W + x; if (!D[p]) continue;
        let v = D[p];
        if (x > 0) v = Math.min(v, same(p, p - 1) ? D[p - 1] + 3 : 3);
        if (y > 0) {
          v = Math.min(v, same(p, p - W) ? D[p - W] + 3 : 3);
          if (x > 0) v = Math.min(v, same(p, p - W - 1) ? D[p - W - 1] + 4 : 4);
          if (x < W - 1) v = Math.min(v, same(p, p - W + 1) ? D[p - W + 1] + 4 : 4);
        }
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) v = Math.min(v, 3);
        D[p] = v;
      }
      for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
        const p = y * W + x; if (!D[p]) continue;
        let v = D[p];
        if (x < W - 1) v = Math.min(v, same(p, p + 1) ? D[p + 1] + 3 : 3);
        if (y < H - 1) {
          v = Math.min(v, same(p, p + W) ? D[p + W] + 3 : 3);
          if (x < W - 1) v = Math.min(v, same(p, p + W + 1) ? D[p + W + 1] + 4 : 4);
          if (x > 0) v = Math.min(v, same(p, p + W - 1) ? D[p + W - 1] + 4 : 4);
        }
        D[p] = v;
      }
      const R = [];
      for (let i = 0; i < n; i++) R.push({ i, area: sizes[i], x0: W, y0: H, x1: 0, y1: 0, maxD: 0, sx: 0, sy: 0, thin: 0 });
      for (let p = 0; p < W * H; p++) {
        const l = label[p]; if (l < 0) continue;
        const r = R[l], x = p % W, y = (p / W) | 0;
        if (x < r.x0) r.x0 = x; if (x > r.x1) r.x1 = x; if (y < r.y0) r.y0 = y; if (y > r.y1) r.y1 = y;
        r.sx += x; r.sy += y;
        const d = D[p] / 3;
        if (d > r.maxD) r.maxD = d;
      }
      // Fracción de la zona que está a menos de 12 u del borde "por ambos lados" es difícil; usamos
      // ancho máximo inscripto (2*maxD) como medida de qué tan grande es la zona para un dedo.
      const minArea = 0.0004 * W * H;
      return R.filter((r) => r.i !== bg).map((r) => ({
        zona: r.i,
        area_u2: Math.round(r.area * k * k),
        bloqueada: r.area < minArea,
        centro: [Math.round((r.sx / r.area) * k), Math.round((r.sy / r.area) * k)],
        bbox: [r.x0, r.y0, r.x1, r.y1].map((v) => Math.round(v * k)),
        anchoMax_u: Math.round(2 * r.maxD * k),
      })).sort((a, b) => a.area_u2 - b.area_u2);
    }, id);
    console.log(`\n== ${id} ==`);
    for (const r of res) console.log(JSON.stringify(r));
  }
}
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
