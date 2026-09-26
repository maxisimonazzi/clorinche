// Herramienta de desarrollo (fantasía): renderiza variantes de un dibujo sin tocar el registro de la app.
//   node fantasia/variantes.mjs <archivo.js> [salida] [--cell 520]
// <archivo.js> es el cuerpo de una función que puede usar todas las piezas de app/js/drawings/fantasia.js
// (girada, mechon, ojo, estrella, nube, ...) y devuelve una lista [{ id, svg }] (svg = contenido interno).
// Genera shots/fantasia/<salida>.png: arriba las líneas, abajo el coloreado al azar (fondo celeste pálido)
// e imprime las estadísticas de zonas de cada variante.
import fs from 'node:fs';
import path from 'node:path';
import { launch, fileUrl, DEV, SHOTS, APP, saveDataUrl } from '../lib.mjs';

const args = process.argv.slice(2);
const ci = args.indexOf('--cell');
const cell = ci >= 0 ? +args[ci + 1] : 520;
const [src, out = 'variantes'] = args.filter((a, i) => !a.startsWith('--') && (ci < 0 || i !== ci + 1));
const code = fs.readFileSync(src, 'utf8');

// Copia de fantasia.js que no registra nada y expone sus piezas en window.F.
let fant = fs.readFileSync(path.join(APP, 'js', 'drawings', 'fantasia.js'), 'utf8');
const nombres = [...new Set([...fant.matchAll(/^ {2}(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]))];
fant = fant.replace(/const add = \(id, nombre, svg\) => CL\.drawings\.add\([^;]*;/, 'const add = () => {};');
fant = fant.replace(/\}\)\(window\.CL\);\s*$/,
  `window.F = {}; ${JSON.stringify(nombres)}.forEach((n) => { try { window.F[n] = eval(n); } catch (e) {} });\n})(window.CL);`);

const zonas = args.includes('--zonas');
// --crop x0,y0,x1,y1 (unidades 0..1000): muestra sólo ese recorte, ampliado.
const cr = args.indexOf('--crop');
const crop = cr >= 0 ? args[cr + 1].split(',').map(Number) : null;
if (cr >= 0) args.splice(cr, 2);
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
const r = await t.page.evaluate(async ({ fant, code, cell, zonas, crop }) => {
  (0, eval)(fant);
  // Zonas finas (grosor = diámetro del mayor círculo que entra, en unidades 0..1000) o chicas, como fantasia/zonas.mjs.
  const finas = async (id) => {
    const src = await raster(id);
    const W = RES, H = RES, N = W * H;
    const { label, sizes, n, wall } = regions(src.getContext('2d', { willReadFrequently: true }), W, H);
    const D = new Float32Array(N);
    for (let p = 0; p < N; p++) D[p] = wall[p] ? 0 : 1e9;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x; if (!D[p]) continue;
      let v = D[p];
      if (x > 0) v = Math.min(v, D[p - 1] + 3);
      if (y > 0) { v = Math.min(v, D[p - W] + 3); if (x > 0) v = Math.min(v, D[p - W - 1] + 4); if (x < W - 1) v = Math.min(v, D[p - W + 1] + 4); }
      D[p] = v;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const p = y * W + x; if (!D[p]) continue;
      let v = D[p];
      if (x < W - 1) v = Math.min(v, D[p + 1] + 3);
      if (y < H - 1) { v = Math.min(v, D[p + W] + 3); if (x < W - 1) v = Math.min(v, D[p + W + 1] + 4); if (x > 0) v = Math.min(v, D[p + W - 1] + 4); }
      D[p] = v;
    }
    const bb = Array.from({ length: n }, () => [1e9, 1e9, -1, -1]);
    const md = new Float32Array(n);
    const ink = [1e9, 1e9, -1, -1];
    for (let p = 0; p < N; p++) {
      const x = p % W, y = (p / W) | 0;
      if (wall[p]) { if (x < ink[0]) ink[0] = x; if (y < ink[1]) ink[1] = y; if (x > ink[2]) ink[2] = x; if (y > ink[3]) ink[3] = y; continue; }
      const l = label[p]; if (l < 0) continue;
      const b = bb[l];
      if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y;
      if (D[p] > md[l]) md[l] = D[p];
    }
    const k = 1000 / W, minArea = MIN_AREA_FRAC * N, bg = label[2 * W + 2];
    const lista = sizes.map((s, i) => ({ i, area: +(s / N * 100).toFixed(3), tiny: s < minArea,
      box: bb[i].map((v) => Math.round(v * k)), grosor: Math.round((2 * md[i] / 3) * k) }))
      .filter((z) => z.i !== bg && !z.tiny && (z.grosor < 45 || z.area < 0.25));
    return { ink: ink.map((v) => Math.round(v * k)), lista };
  };
  const lista = new Function('F', 'with (F) {' + code + '\n}')(window.F);
  const pad = 12, lab = 30;
  const c = CL.util.canvas(lista.length * (cell + pad) + pad, 2 * (cell + pad) + lab + pad);
  const g = c.getContext('2d');
  g.fillStyle = '#f3f0ea'; g.fillRect(0, 0, c.width, c.height);
  const stats = [];
  for (let i = 0; i < lista.length; i++) {
    const { id, svg } = lista[i];
    CL.drawings.add('tmp', id, id, svg);
    const a = await analyze(id, 7 + i);
    a.stats.bytes = svg.replace(/\s+/g, ' ').trim().length;
    if (zonas) a.stats.zonas = await finas(id);
    stats.push(a.stats);
    const x = pad + i * (cell + pad);
    g.imageSmoothingQuality = 'high';
    const k = a.src.width / 1000;
    const [sx, sy, sw, sh] = crop ? [crop[0] * k, crop[1] * k, (crop[2] - crop[0]) * k, (crop[3] - crop[1]) * k] : [0, 0, a.src.width, a.src.height];
    const e = cell / Math.max(sw, sh);
    g.drawImage(a.src, sx, sy, sw, sh, x, pad, sw * e, sh * e);
    g.drawImage(a.colored, sx, sy, sw, sh, x, pad * 2 + cell, sw * e, sh * e);
    g.fillStyle = '#2b2240'; g.font = '600 20px sans-serif';
    g.fillText(`${id} · zonas ${a.stats.fillable} · ${a.stats.bytes} B`, x + 4, 2 * (cell + pad) + 24);
  }
  return { png: c.toDataURL('image/png'), stats };
}, { fant, code, cell, zonas, crop });
const f = saveDataUrl(r.png, path.join(SHOTS, 'fantasia', out + '.png'));
for (const s of r.stats) {
  const { zonas: z, ...resto } = s;
  console.log(JSON.stringify(resto));
  if (z) {
    console.log(`   tinta ${z.ink.join(',')}  (margen ≥ 40: x 40..960, y 40..960)`);
    for (const q of z.lista) console.log(`   fina/chica: área ${q.area}% grosor ${q.grosor} caja ${q.box.join(',')}`);
  }
}
console.log('->', f);
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
