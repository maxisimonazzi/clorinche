// Perfil rápido: tiempos de cada etapa copiando el código del módulo (vía CL.upload._t).
import fs from 'node:fs';
import path from 'node:path';
import { launch, appUrl, DEV } from '../lib.mjs';
const t = await launch({ size: 'desktop' });
const { page } = t;
await page.goto(appUrl('subir'));
await page.waitForTimeout(300);
const b64 = fs.readFileSync(path.join(DEV, 'subir', 'img', process.argv[2] || 'pagina-sombra.jpg')).toString('base64');
const r = await page.evaluate(async (b64) => {
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const src = await CL.upload.decode(new Blob([bin], { type: 'image/jpeg' }));
  const out = {};
  for (const mode of ['page', 'photo']) {
    for (let k = 0; k < 2; k++) {
      const t0 = performance.now();
      CL.upload.process(src, { mode, level: 50, thick: true });
      out[mode + k] = Math.round(performance.now() - t0);
    }
  }
  // gauss suelto
  const n = src.width * src.height, a = new Float32Array(n).map(() => Math.random() * 255);
  let t0 = performance.now();
  const W = src.width, H = src.height;
  const box = (src, dst, w, h, r) => { const k = 1 / (r + r + 1);
    for (let y = 0; y < h; y++) { const row = y * w; let acc = src[row] * (r + 1);
      for (let x = 0; x < r; x++) acc += src[row + Math.min(x, w - 1)];
      for (let x = 0; x < w; x++) { acc += src[row + Math.min(x + r, w - 1)] - src[row + Math.max(x - r - 1, 0)]; dst[row + x] = acc * k; } } };
  const b = new Float32Array(n);
  box(a, b, W, H, 3);
  out.boxH = Math.round(performance.now() - t0);
  return out;
}, b64);
console.log(r, t.errors);
await t.close();
