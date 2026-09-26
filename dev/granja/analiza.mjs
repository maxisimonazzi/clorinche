// Análisis de zonas de "granja" (copia adaptada de review-granja): estadísticas de zonas (área, grosor mínimo) y recortes ampliados.
//   node granja/analiza.mjs stats vaca,chancho
//   node granja/analiza.mjs crop vaca 150 450 450 800 [nombre]
//   node granja/analiza.mjs labels vaca
import path from 'node:path';
import { launch, fileUrl, saveDataUrl, SHOTS, DEV } from '../lib.mjs';

const [mode, idsArg, ...rest] = process.argv.slice(2);
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);

await t.page.evaluate(() => {
  window.__an = async (id) => {
    const src = await raster(id);
    const W = RES, H = RES;
    const ctx = src.getContext('2d', { willReadFrequently: true });
    const { label, sizes, n, wall } = regions(ctx, W, H);
    const bg = label[2 * W + 2];
    // Distancia chamfer a la pared (o a otra zona) para medir grosor.
    const N = W * H, INF = 1e9;
    const dt = new Float32Array(N);
    for (let p = 0; p < N; p++) dt[p] = label[p] < 0 ? 0 : INF;
    const a = 1, b = Math.SQRT2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x; if (!dt[p]) continue; let v = dt[p];
      if (x > 0) v = Math.min(v, dt[p - 1] + a);
      if (y > 0) { v = Math.min(v, dt[p - W] + a); if (x > 0) v = Math.min(v, dt[p - W - 1] + b); if (x < W - 1) v = Math.min(v, dt[p - W + 1] + b); }
      dt[p] = v;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const p = y * W + x; if (!dt[p]) continue; let v = dt[p];
      if (x < W - 1) v = Math.min(v, dt[p + 1] + a);
      if (y < H - 1) { v = Math.min(v, dt[p + W] + a); if (x < W - 1) v = Math.min(v, dt[p + W + 1] + b); if (x > 0) v = Math.min(v, dt[p + W - 1] + b); }
      dt[p] = v;
    }
    const k = 1000 / RES;
    const info = Array.from({ length: n }, (_, i) => ({ i, area: sizes[i], x0: W, y0: H, x1: 0, y1: 0, sx: 0, sy: 0, maxd: 0, mx: 0, my: 0 }));
    for (let p = 0; p < N; p++) {
      const l = label[p]; if (l < 0) continue; const r = info[l]; const x = p % W, y = (p / W) | 0;
      if (x < r.x0) r.x0 = x; if (x > r.x1) r.x1 = x; if (y < r.y0) r.y0 = y; if (y > r.y1) r.y1 = y;
      r.sx += x; r.sy += y; if (dt[p] > r.maxd) { r.maxd = dt[p]; r.mx = x; r.my = y; }
    }
    const out = info.map((r) => ({
      i: r.i, bg: r.i === bg, tiny: r.area < MIN_AREA_FRAC * N,
      areaU: Math.round(r.area * k * k), bbox: [r.x0, r.y0, r.x1, r.y1].map((v) => Math.round(v * k)),
      c: [Math.round(r.sx / r.area * k), Math.round(r.sy / r.area * k)],
      grosor: Math.round(2 * r.maxd * k), // diámetro del mayor círculo inscripto
    }));
    return { out, label, W, H, src };
  };
  window.__stats = async (id) => (await __an(id)).out;
  window.__crop = async (id, x0, y0, x1, y1) => {
    const a = await analyze(id, 7);
    const s = RES / 1000;
    const w = (x1 - x0) * s, h = (y1 - y0) * s;
    const sc = Math.min(1, 700 / w, 700 / h) * 1;
    const cw = Math.round(w * sc), ch = Math.round(h * sc);
    const c = CL.util.canvas(cw * 2 + 30, ch + 20);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f3f0ea'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(a.src, x0 * s, y0 * s, w, h, 10, 10, cw, ch);
    ctx.drawImage(a.colored, x0 * s, y0 * s, w, h, cw + 20, 10, cw, ch);
    return c.toDataURL('image/png');
  };
  window.__labels = async (id) => {
    const a = await analyze(id, 7);
    const st = (await __an(id)).out;
    const c = CL.util.canvas(1000, 1000);
    const ctx = c.getContext('2d');
    ctx.drawImage(a.colored, 0, 0, 1000, 1000);
    ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
    for (const r of st) { if (r.bg) continue; ctx.fillStyle = '#fff'; ctx.fillText(r.i, r.c[0] + 1, r.c[1] + 7); ctx.fillStyle = '#000'; ctx.fillText(r.i, r.c[0], r.c[1] + 6); }
    return c.toDataURL('image/png');
  };
});

if (mode === 'stats') {
  for (const id of idsArg.split(',')) {
    const st = await t.page.evaluate((id) => __stats(id), id);
    console.log('==', id);
    for (const r of st) if (!r.bg) console.log(JSON.stringify(r));
  }
} else if (mode === 'flacas') {
  // Zonas pintables con grosor (diámetro inscripto) menor al umbral: candidatas a problemas.
  const lim = +(rest[0] || 45);
  for (const id of idsArg.split(',')) {
    const st = await t.page.evaluate((id) => __stats(id), id);
    const f = st.filter((r) => !r.bg && !r.tiny && r.grosor < lim);
    console.log(id, 'zonas:', st.filter((r) => !r.bg && !r.tiny).length, 'flacas:', JSON.stringify(f.map((r) => ({ i: r.i, c: r.c, g: r.grosor, bbox: r.bbox }))));
  }
} else if (mode === 'crop') {
  const [x0, y0, x1, y1, name] = rest;
  const png = await t.page.evaluate(([id, a, b, c, d]) => __crop(id, a, b, c, d), [idsArg, +x0, +y0, +x1, +y1]);
  console.log(saveDataUrl(png, path.join(SHOTS, 'granja', `${idsArg}-${name || [x0, y0].join('-')}.png`)));
} else if (mode === 'labels') {
  for (const id of idsArg.split(',')) {
    const png = await t.page.evaluate((id) => __labels(id), id);
    console.log(saveDataUrl(png, path.join(SHOTS, 'granja', `${id}-zonas.png`)));
  }
}
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
