// Perfil de binarize por partes: node subir/prof3.mjs [factor]
import fs from 'node:fs';
import path from 'node:path';
import { launch, appUrl, DEV } from '../lib.mjs';
const rate = +(process.argv[2] || 1);
const t = await launch({ size: 'desktop' });
const { page } = t;
await page.goto(appUrl('subir'));
await page.waitForFunction(() => window.CL && CL.upload);
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate });
const b64 = fs.readFileSync(path.join(DEV, 'subir', 'img', 'enorme.jpg')).toString('base64');
const r = await page.evaluate(async (b64) => {
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const src = await CL.upload.decode(new Blob([bin], { type: 'image/jpeg' }));
  const P = CL.upload._p;
  const sc = P.scoreFor(src, 'page');
  const w = 1280, h = 960, f = P.fieldAt(sc, w, h), B = P.makeBufs(w * h);
  const T = { thr: 0, rsBlack: 0, dil: 0, rsWhite: 0, put: 0 };
  const m = B.mask;
  for (let k = 0; k < 5; k++) {
    let t0 = performance.now();
    for (let i = 0; i < w * h; i++) m[i] = f[i] > 0.32 ? 1 : 0;
    T.thr += performance.now() - t0; t0 = performance.now();
    P.removeSmall(m, w, h, 1, (w * 0.0045) ** 2, 0, true, B);
    T.rsBlack += performance.now() - t0; t0 = performance.now();
    P.dilate(m, w, h, w * 0.0022, B);
    T.dil += performance.now() - t0; t0 = performance.now();
    P.removeSmall(m, w, h, 0, (w * 0.009) ** 2, 0, false, B);
    T.rsWhite += performance.now() - t0; t0 = performance.now();
    P.maskToCanvas(m, w, h, null, B);
    T.put += performance.now() - t0;
  }
  for (const k in T) T[k] = Math.round(T[k] / 5);
  return T;
}, b64);
console.log(JSON.stringify(r), t.errors);
await t.close();
