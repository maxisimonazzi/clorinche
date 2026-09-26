// Herramienta de desarrollo (fantasía): lista las zonas chicas o finas de cada dibujo, con su área (% del lienzo),
// caja (unidades 0..1000) y grosor = diámetro del mayor círculo que entra en la zona (transformada de distancia).
// También imprime la caja total ocupada por la tinta (para controlar el margen de 40 u).
//   node fantasia/zonas.mjs [id,id...] [--todas]
import path from 'node:path';
import { launch, fileUrl, DEV } from '../lib.mjs';
const args = process.argv.slice(2);
const todas = args.includes('--todas');
const ids = (args.find((a) => !a.startsWith('--')) || 'unicornio,dragon,castillo,sirena,robot,monstruito').split(',');
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
for (const id of ids) {
  const r = await t.page.evaluate(async ({ id, todas }) => {
    const src = await raster(id);
    const W = RES, H = RES, N = W * H;
    const { label, sizes, n, wall } = regions(src.getContext('2d', { willReadFrequently: true }), W, H);
    // Transformada de distancia (chaflán 3-4) a la pared más cercana.
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
    const zonas = sizes.map((s, i) => ({
      i, area: +(s / N * 100).toFixed(3), tiny: s < minArea,
      box: bb[i].map((v) => Math.round(v * k)),
      grosor: Math.round((2 * md[i] / 3) * k),
    })).filter((z) => z.i !== bg && (todas || z.tiny || z.grosor < 45 || z.area < 0.25));
    return { zonas, ink: ink.map((v) => Math.round(v * k)), bytes: CL.drawings.svg(id).length };
  }, { id, todas });
  console.log(`== ${id}  (${r.bytes} bytes, tinta ${r.ink.join(',')})`);
  for (const z of r.zonas) console.log(`  ${z.tiny ? 'DIMINUTA' : 'zona    '} área ${z.area}% grosor ${z.grosor} caja ${z.box.join(',')}`);
}
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
