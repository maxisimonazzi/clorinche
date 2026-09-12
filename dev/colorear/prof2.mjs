import { launch, appUrl } from '../lib.mjs';
const t = await launch({ size: 'desktop' });
await t.page.goto(appUrl('inicio'));
await t.page.waitForTimeout(400);
const r = await t.page.evaluate(async () => {
  const src = await CL.coloring.loadSource('vaca', 2048);
  const lines = CL.coloring.rasterLines(src.image, src.w, src.h);
  const im = lines.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 2048, 2048);
  const out = [];
  for (let k = 0; k < 3; k++) {
    const t0 = performance.now();
    const m = await CL.regions.computeAsync(im);
    out.push([Math.round(performance.now() - t0), m.timings.reduce((a, b) => a + b, 0), m.timings]);
  }
  return out;
});
console.log(JSON.stringify(r), t.errors);
await t.close();
