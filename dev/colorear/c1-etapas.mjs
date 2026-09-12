// Duración de cada etapa del cálculo de zonas (cada una es una tarea sin cortes), con CPU normal y 4x más lenta.
import { launch, appUrl, ready } from '../review-colorear/common.mjs';
const t = await launch({ size: 'tablet' });
const { page } = t;
const cdp = await page.context().newCDPSession(page);
await page.goto(appUrl('colorear/vaca')); await ready(page); await page.waitForTimeout(300);
for (const rate of [1, 4]) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  const r = await page.evaluate(async () => {
    const src = await CL.coloring.loadSource('vaca', 2048);
    const lines = CL.coloring.rasterLines(src.image, src.w, src.h);
    const t0 = performance.now(); const m = await CL.regions.computeAsync(lines); const tot = performance.now() - t0; src.revoke();
    return { etapas: m.timings, total: Math.round(tot) };
  });
  console.log('cpu x' + rate, 'etapas [paredes, tramos, etiquetas, dist ida, dist vuelta] ms', JSON.stringify(r));
}
await t.close();
