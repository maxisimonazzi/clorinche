// Naturaleza: análisis de zonas (área, grosor máximo inscripto) y recortes con zoom.
// Uso: cd dev && node naturaleza/analisis.mjs sol,flor  [--crop id:x0,y0,x1,y1[:nombre]] ...
import path from 'node:path';
import { launch, fileUrl, saveDataUrl, SHOTS, DEV } from '../lib.mjs';

const args = process.argv.slice(2);
const ids = (args[0] || 'sol,flor,arbol,mariposa,arcoiris,hongo').split(',');
const crops = [];
for (let i = 0; i < args.length; i++) if (args[i] === '--crop') crops.push(args[i + 1]);
// --variant archivo.js: carga una variante de prueba (redefine dibujos) para evaluar propuestas sin tocar la app.
const vIdx = args.indexOf('--variant');
const variant = vIdx >= 0 ? path.resolve(args[vIdx + 1]) : null;
const tag = variant ? '-v' : '';

const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
if (variant) await t.page.addScriptTag({ path: variant });

await t.page.evaluate(() => {
  window.zoneReport = async (id) => {
    const src = await raster(id);
    const W = RES, H = RES, k = W / 1000;
    const { label, sizes, n, wall } = regions(src.getContext('2d', { willReadFrequently: true }), W, H);
    const bg = label[2 * W + 2];
    // distancia (chamfer 3-4) a la pared/otra zona, dentro de cada zona
    const INF = 1e9, dist = new Float32Array(W * H);
    for (let p = 0; p < W * H; p++) dist[p] = label[p] < 0 ? 0 : INF;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x; if (!dist[p]) continue;
      let d = dist[p];
      if (x > 0) d = Math.min(d, dist[p - 1] + 3);
      if (y > 0) { d = Math.min(d, dist[p - W] + 3); if (x > 0) d = Math.min(d, dist[p - W - 1] + 4); if (x < W - 1) d = Math.min(d, dist[p - W + 1] + 4); }
      dist[p] = d;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const p = y * W + x; if (!dist[p]) continue;
      let d = dist[p];
      if (x < W - 1) d = Math.min(d, dist[p + 1] + 3);
      if (y < H - 1) { d = Math.min(d, dist[p + W] + 3); if (x < W - 1) d = Math.min(d, dist[p + W + 1] + 4); if (x > 0) d = Math.min(d, dist[p + W - 1] + 4); }
      dist[p] = d;
    }
    const maxd = new Float32Array(n), bx = [];
    for (let i = 0; i < n; i++) bx.push({ x0: W, y0: H, x1: 0, y1: 0, cx: 0, cy: 0 });
    for (let p = 0; p < W * H; p++) {
      const l = label[p]; if (l < 0) continue;
      const x = p % W, y = (p / W) | 0, b = bx[l];
      if (dist[p] > maxd[l]) { maxd[l] = dist[p]; b.cx = x; b.cy = y; }
      if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
    }
    const out = [];
    for (let i = 0; i < n; i++) {
      if (i === bg) continue;
      out.push({
        i, area: Math.round(sizes[i] / (k * k)), // u²
        grosor: Math.round((2 * maxd[i] / 3) / k), // diámetro del círculo inscripto máximo, en u
        bbox: [bx[i].x0, bx[i].y0, bx[i].x1, bx[i].y1].map((v) => Math.round(v / k)),
        centro: [Math.round(bx[i].cx / k), Math.round(bx[i].cy / k)],
      });
    }
    out.sort((a, b) => a.area - b.area);
    return out;
  };
  window.cropShot = async (id, x0, y0, x1, y1, outSize = 800) => {
    const a = await analyze(id, 7);
    const k = RES / 1000;
    const w = x1 - x0, h = y1 - y0, s = outSize / Math.max(w, h);
    const c = CL.util.canvas(Math.round(w * s) * 2 + 20, Math.round(h * s));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f3f0ea'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(a.src, x0 * k, y0 * k, w * k, h * k, 0, 0, w * s, h * s);
    ctx.drawImage(a.colored, x0 * k, y0 * k, w * k, h * k, w * s + 20, 0, w * s, h * s);
    return c.toDataURL('image/png');
  };
});

if (args.includes('--single')) {
  for (const id of ids) {
    const r = await t.page.evaluate((id) => window.makeSingle(id), id);
    console.log(JSON.stringify(r.stats), '->', saveDataUrl(r.png, path.join(SHOTS, 'naturaleza', id + tag + '.png')));
  }
}
if (!crops.length) {
  for (const id of ids) {
    const r = await t.page.evaluate((id) => window.zoneReport(id), id);
    console.log('== ' + id + ' (' + r.length + ' zonas sin fondo)');
    for (const z of r) console.log(`  area=${z.area}u²  grosor=${z.grosor}u  bbox=${z.bbox.join(',')}  centro=${z.centro.join(',')}`);
  }
}
for (const c of crops) {
  const [id, box, name] = c.split(':');
  const [x0, y0, x1, y1] = box.split(',').map(Number);
  const png = await t.page.evaluate((a) => window.cropShot(...a), [id, x0, y0, x1, y1]);
  const f = saveDataUrl(png, path.join(SHOTS, 'naturaleza', `${id}-${name || box.replace(/,/g, '_')}${tag}.png`));
  console.log('->', f);
}
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
