// Desarrollo de dibujos de "mar": vista previa aislada (sólo el registro y mar.js, sin los archivos de las
// otras categorías) con herramientas para iterar.
//   cd dev
//   node mar/dev.mjs delfin,medusa             -> shots/mar/dev/<id>.png (líneas + coloreado) y estadísticas
//   node mar/dev.mjs --sheet [--plain]         -> shots/mar/dev/hoja(-lineas).png (toda la categoría)
//   node mar/dev.mjs --crop id x0 y0 x1 y1 [n] -> shots/mar/dev/crop-<n>.png (recorte ampliado, coords 0..1000)
//   node mar/dev.mjs --zonas ids               -> tabla de zonas (área u², caja, ancho máximo, punto más adentro)
//   --copia archivo.js                         -> usa esa copia de trabajo en vez de app/js/drawings/mar.js
//                                                 (para iterar sin tocar la app mientras otros la usan)
import fs from 'node:fs';
import path from 'node:path';
import { launch, fileUrl, saveDataUrl, SHOTS, DEV } from '../lib.mjs';

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const iCopia = args.indexOf('--copia');
const copia = iCopia >= 0 ? args.splice(iCopia, 2)[1] : null;
const pos = args.filter((a) => !a.startsWith('--'));
const OUT = path.join(SHOTS, 'mar', 'dev');

// Página: la vista previa original, pero sólo con el registro y el archivo de "mar" elegido.
const src = fs.readFileSync(path.join(DEV, 'drawings', 'preview.html'), 'utf8');
const marJs = copia ? path.relative(path.join(DEV, 'mar'), path.resolve(copia)).split(path.sep).join('/')
  : '../../app/js/drawings/mar.js';
const html = src
  .replace(/<script src="\.\.\/\.\.\/app\/js\/drawings\/(?!registry)[^"]+"><\/script>\r?\n?/g, '')
  .replace('<script src="../../app/js/drawings/registry.js"></script>', `$&\n<script src="${marJs}"></script>`);
const page = path.join(DEV, 'mar', 'preview-dev.html');
fs.writeFileSync(page, html);

const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(page));
await t.page.waitForFunction(() => window.ready);

if (flag('--sheet')) {
  const r = await t.page.evaluate((o) => window.makeSheet(o), { cat: 'mar', plain: flag('--plain'), cols: 4, cell: 420 });
  for (const s of r.stats) console.log(JSON.stringify(s));
  console.log('->', saveDataUrl(r.png, path.join(OUT, 'hoja' + (flag('--plain') ? '-lineas' : '') + '.png')));
} else if (flag('--crop')) {
  const [id, x0, y0, x1, y1, nombre] = pos;
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
  console.log(saveDataUrl(png, path.join(OUT, 'crop-' + (nombre || id) + '.png')));
} else if (flag('--zonas')) {
  for (const id of pos[0].split(',')) {
    const res = await t.page.evaluate(async (id) => {
      const W = 2048, H = 2048, k = 1000 / W;
      const srcC = await raster(id);
      const { label, sizes, n } = regions(srcC.getContext('2d', { willReadFrequently: true }), W, H);
      const bg = label[2 * W + 2];
      // Distancia (chamfer 3-4) de cada píxel de zona al borde de su zona -> ancho máximo inscripto.
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
      for (let i = 0; i < n; i++) R.push({ i, area: sizes[i], x0: W, y0: H, x1: 0, y1: 0, maxD: 0, sx: 0, sy: 0, px: 0, py: 0 });
      for (let p = 0; p < W * H; p++) {
        const l = label[p]; if (l < 0) continue;
        const r = R[l], x = p % W, y = (p / W) | 0;
        if (x < r.x0) r.x0 = x; if (x > r.x1) r.x1 = x; if (y < r.y0) r.y0 = y; if (y > r.y1) r.y1 = y;
        r.sx += x; r.sy += y;
        if (D[p] / 3 > r.maxD) { r.maxD = D[p] / 3; r.px = x; r.py = y; }
      }
      const minArea = 0.0004 * W * H;
      return R.filter((r) => r.i !== bg).map((r) => ({
        area: Math.round(r.area * k * k),
        bloq: r.area < minArea ? 1 : 0,
        centro: [Math.round((r.sx / r.area) * k), Math.round((r.sy / r.area) * k)],
        caja: [r.x0, r.y0, r.x1, r.y1].map((v) => Math.round(v * k)),
        ancho: Math.round(2 * r.maxD * k),
        interior: [Math.round(r.px * k), Math.round(r.py * k)],
      })).sort((a, b) => a.area - b.area);
    }, id);
    console.log(`\n== ${id} ==`);
    for (const r of res) console.log(JSON.stringify(r));
  }
} else {
  const ids = pos[0] ? pos[0].split(',') : [];
  for (const id of ids) {
    const r = await t.page.evaluate(async (id) => {
      const d = CL.drawings.get(id);
      if (!d) return { error: 'no existe ' + id };
      const out = await window.makeSingle(id);
      // Caja del dibujo (u) y tamaño del SVG.
      const a = await raster(id), W = 2048, k = 1000 / W;
      const px = a.getContext('2d').getImageData(0, 0, W, W).data;
      let x0 = W, y0 = W, x1 = 0, y1 = 0;
      for (let p = 0; p < W * W; p++) if (px[p * 4] < 150) {
        const x = p % W, y = (p / W) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      out.stats.caja = [x0, y0, x1, y1].map((v) => Math.round(v * k));
      out.stats.bytes = d.inner.replace(/\s+/g, ' ').length;
      return out;
    }, id);
    if (r.error) { console.log(r.error); continue; }
    console.log(JSON.stringify(r.stats), '->', saveDataUrl(r.png, path.join(OUT, id + '.png')));
  }
}
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
fs.unlinkSync(page); // la página generada es temporal
