// Análisis de zonas de los paisajes (herramienta de desarrollo).
//   cd dev && node paisajes/analiza.mjs [id,id,...]   (sin ids: todos los de 'paisajes')
// Rasteriza cada dibujo a 2048 px (como la app), calcula zonas (pared = luminancia < 150, 4-conexas) y avisa:
//   - zonas pintables chicas (área < 45×45 u o sin lugar para un círculo de 40 u de diámetro),
//   - tramos finos (< 25 u de ancho libre entre líneas, con el borde del lienzo contando como pared),
//   - tamaño del SVG y números no enteros.
// Genera dev/shots/paisajes/analisis/<id>.png: zonas chicas en rojo, tramos finos en naranja, fondo celeste.
import path from 'node:path';
import { launch, fileUrl, saveDataUrl, SHOTS, DEV } from '../lib.mjs';

const arg = process.argv[2] || '';
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
const ids = arg ? arg.split(',') : await t.page.evaluate(() => CL.drawings.list('paisajes').map((d) => d.id));

for (const id of ids) {
  const r = await t.page.evaluate(async (id) => {
    const d = CL.drawings.get(id);
    if (!d) return { error: 'no existe ' + id };
    const src = await raster(id);
    const W = src.width, H = src.height, N = W * H, k = 1000 / W;
    const { label, sizes, n, wall } = regions(src.getContext('2d', { willReadFrequently: true }), W, H);
    const minArea = 0.0004 * N;
    const bg = label[2 * W + 2];

    // Transformada de distancia euclídea exacta (Felzenszwalb), con el borde del lienzo como pared.
    const Wp = W + 2, Hp = H + 2;
    function dt1(f, nn, dd, v, z) {
      let kk = 0; v[0] = 0; z[0] = -1e30; z[1] = 1e30;
      for (let q = 1; q < nn; q++) {
        let s = ((f[q] + q * q) - (f[v[kk]] + v[kk] * v[kk])) / (2 * q - 2 * v[kk]);
        while (s <= z[kk]) { kk--; s = ((f[q] + q * q) - (f[v[kk]] + v[kk] * v[kk])) / (2 * q - 2 * v[kk]); }
        kk++; v[kk] = q; z[kk] = s; z[kk + 1] = 1e30;
      }
      kk = 0;
      for (let q = 0; q < nn; q++) { while (z[kk + 1] < q) kk++; dd[q] = (q - v[kk]) * (q - v[kk]) + f[v[kk]]; }
    }
    function edt(feat) {
      const g = new Float64Array(Wp * Hp);
      for (let i = 0; i < Wp * Hp; i++) g[i] = feat[i] ? 0 : 1e20;
      const m = Math.max(Wp, Hp);
      const f = new Float64Array(m), dd = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1);
      for (let x = 0; x < Wp; x++) {
        for (let y = 0; y < Hp; y++) f[y] = g[y * Wp + x];
        dt1(f, Hp, dd, v, z);
        for (let y = 0; y < Hp; y++) g[y * Wp + x] = dd[y];
      }
      for (let y = 0; y < Hp; y++) {
        const o = y * Wp;
        for (let x = 0; x < Wp; x++) f[x] = g[o + x];
        dt1(f, Wp, dd, v, z);
        for (let x = 0; x < Wp; x++) g[o + x] = dd[x];
      }
      return g;
    }
    const feat = new Uint8Array(Wp * Hp);
    for (let y = 0; y < Hp; y++) for (let x = 0; x < Wp; x++) {
      if (x === 0 || y === 0 || x === Wp - 1 || y === Hp - 1) feat[y * Wp + x] = 1;
      else feat[y * Wp + x] = wall[(y - 1) * W + (x - 1)];
    }
    const D = edt(feat);
    const rr = 12.5 / k; // radio del disco de 25 u (en px)
    const ero = new Uint8Array(Wp * Hp);
    for (let i = 0; i < Wp * Hp; i++) ero[i] = D[i] >= rr * rr ? 1 : 0;
    const D2 = edt(ero);
    const thin = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x, q = (y + 1) * Wp + (x + 1);
      if (!wall[p] && D2[q] > rr * rr) thin[p] = 1;
    }
    // Estadísticas por zona.
    const Z = Array.from({ length: n }, () => ({ c: 0, sx: 0, sy: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1, maxD: 0, thin: 0 }));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x, l = label[p];
      if (l < 0) continue;
      const a = Z[l];
      a.c++; a.sx += x; a.sy += y;
      if (x < a.x0) a.x0 = x; if (x > a.x1) a.x1 = x; if (y < a.y0) a.y0 = y; if (y > a.y1) a.y1 = y;
      const dv = D[(y + 1) * Wp + (x + 1)];
      if (dv > a.maxD) a.maxD = dv;
      if (thin[p]) a.thin++;
    }
    const zonas = Z.map((a, i) => ({
      i, area: Math.round(a.c * k * k), cx: Math.round(a.sx / a.c * k), cy: Math.round(a.sy / a.c * k),
      w: Math.round((a.x1 - a.x0 + 1) * k), h: Math.round((a.y1 - a.y0 + 1) * k),
      r: Math.round(Math.sqrt(a.maxD) * k), fino: Math.round(a.thin * k * k),
      locked: a.c < minArea, bg: i === bg,
    }));
    const fillable = zonas.filter((z) => !z.bg && !z.locked);
    const chicas = fillable.filter((z) => z.area < 2025 || z.r < 20);
    // Tramos finos: componentes conexas de píxeles finos con área >= 250 u².
    const tl = new Int32Array(N).fill(-1);
    const st = new Int32Array(N);
    const tramos = [];
    for (let p = 0; p < N; p++) {
      if (!thin[p] || tl[p] >= 0) continue;
      let sp = 0, c = 0, sx = 0, sy = 0; st[sp++] = p; tl[p] = tramos.length;
      while (sp) {
        const q = st[--sp]; c++; const x = q % W, y = (q / W) | 0; sx += x; sy += y;
        if (x > 0 && thin[q - 1] && tl[q - 1] < 0) { tl[q - 1] = tramos.length; st[sp++] = q - 1; }
        if (x < W - 1 && thin[q + 1] && tl[q + 1] < 0) { tl[q + 1] = tramos.length; st[sp++] = q + 1; }
        if (y > 0 && thin[q - W] && tl[q - W] < 0) { tl[q - W] = tramos.length; st[sp++] = q - W; }
        if (y < H - 1 && thin[q + W] && tl[q + W] < 0) { tl[q + W] = tramos.length; st[sp++] = q + W; }
      }
      tramos.push({ area: Math.round(c * k * k), cx: Math.round(sx / c * k), cy: Math.round(sy / c * k), zona: label[p] });
    }
    const finos = tramos.filter((f) => f.area >= 250);
    // Imagen: fondo celeste, zonas grises claras, chicas en rojo, tramos finos en naranja, líneas encima.
    const out = CL.util.canvas(W, H);
    const octx = out.getContext('2d');
    const im = octx.createImageData(W, H);
    const od = im.data;
    const bad = new Set(chicas.map((z) => z.i));
    for (let p = 0; p < N; p++) {
      const l = label[p];
      let c = [255, 255, 255];
      if (l >= 0) {
        if (l === bg) c = [214, 240, 255];
        else if (zonas[l].locked) c = [255, 255, 255];
        else if (bad.has(l)) c = [255, 80, 80];
        else c = [236, 232, 225];
        if (thin[p] && tl[p] >= 0 && tramos[tl[p]].area >= 250) c = [255, 160, 30];
      }
      od[p * 4] = c[0]; od[p * 4 + 1] = c[1]; od[p * 4 + 2] = c[2]; od[p * 4 + 3] = 255;
    }
    octx.putImageData(im, 0, 0);
    octx.globalCompositeOperation = 'multiply';
    octx.drawImage(src, 0, 0);
    const small = CL.util.canvas(1000, 1000);
    const sctx = small.getContext('2d');
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(out, 0, 0, 1000, 1000);
    const inner = d.inner;
    const decimales = (inner.match(/\d\.\d/g) || []).length;
    return {
      id, bytes: inner.length, decimales, zonas: fillable.length, fondo: +(zonas[bg] ? zonas[bg].area / 1e6 : 0).toFixed(3),
      brillitos: zonas.filter((z) => z.locked && !z.bg).length,
      chicas: chicas.map((z) => `#${z.i} (${z.cx},${z.cy}) ${z.w}x${z.h} área ${z.area} r ${z.r}`),
      finos: finos.map((f) => `(${f.cx},${f.cy}) área ${f.area} en zona #${f.zona}${f.zona === bg ? ' (fondo)' : ''}`),
      lista: fillable.sort((a, b) => a.area - b.area).map((z) => `#${z.i}(${z.cx},${z.cy}) ${z.area}/r${z.r}`),
      png: small.toDataURL('image/png'),
    };
  }, id);
  if (r.error) { console.log(r.error); continue; }
  const f = saveDataUrl(r.png, path.join(SHOTS, 'paisajes', 'analisis', id + '.png'));
  console.log(`\n== ${r.id}: ${r.zonas} zonas pintables · ${r.brillitos} brillitos · fondo ${r.fondo} · SVG ${r.bytes} B${r.decimales ? ' · ¡' + r.decimales + ' decimales!' : ''}`);
  if (r.chicas.length) console.log('  chicas:\n    ' + r.chicas.join('\n    '));
  if (r.finos.length) console.log('  tramos finos:\n    ' + r.finos.join('\n    '));
  if (process.argv.includes('--lista')) console.log('  zonas: ' + r.lista.join(' | '));
  console.log('  ->', f);
}
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
