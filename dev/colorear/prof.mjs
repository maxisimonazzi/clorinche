import { launch, appUrl } from '../lib.mjs';
const t = await launch({ size: 'desktop' });
await t.page.goto(appUrl('inicio'));
await t.page.waitForTimeout(400);
const r = await t.page.evaluate(async () => {
  const src = await CL.coloring.loadSource('vaca', 2048);
  const lines = CL.coloring.rasterLines(src.image, src.w, src.h);
  const out = {};
  let t0 = performance.now();
  const im = lines.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 2048, 2048);
  out.getImageData = performance.now() - t0;
  for (let k = 0; k < 3; k++) { t0 = performance.now(); CL.regions.compute(im); out["compute" + k] = performance.now() - t0; out["t" + k] = CL.regions.compute(im).timings; }
  return out;
});
console.log(r, t.errors);
await t.close();
