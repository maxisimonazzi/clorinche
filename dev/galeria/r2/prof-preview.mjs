// Mide cada paso de la vista previa de colorear (para ubicar las tareas largas).
import { launch, appUrl } from '../../lib.mjs';
import { PROFILE } from './lib.mjs';
const t = await launch({ size: process.argv[2] || 'tablet', persistent: PROFILE });
const { page } = t;
await page.goto(appUrl('obras'));
await page.waitForTimeout(1500);
const r = await page.evaluate(async () => {
  const w = (await CL.db.works.list()).find((x) => x.kind === 'colorear' && x.source === 'vaca' && x.paint);
  const C = CL.coloring, out = {};
  let t0 = performance.now();
  const src = await C.loadSource(w.source, 1204); out.load = performance.now() - t0;
  t0 = performance.now();
  const p = await createImageBitmap(w.paint, { resizeWidth: 1204, resizeHeight: 1204, resizeQuality: 'high' }); out.bitmap = performance.now() - t0;
  t0 = performance.now();
  const c = C.composite(p, src.image, 1204, 1204); out.composite = performance.now() - t0;
  t0 = performance.now();
  c.getContext('2d').getImageData(0, 0, 1, 1); out.flush = performance.now() - t0;
  t0 = performance.now();
  const b = await CL.util.canvasToBlob(c); out.toBlob = performance.now() - t0;
  const c2 = CL.util.canvas(1204, 1204); t0 = performance.now();
  c2.getContext('2d').drawImage(src.image, 0, 0, 1204, 1204); c2.getContext('2d').getImageData(0, 0, 1, 1); out.svgOnly = performance.now() - t0;
  out.paintSize = w.paint.size; out.w = w.w;
  for (const k in out) out[k] = Math.round(out[k]);
  return out;
});
console.log(JSON.stringify(r));
await t.close();
