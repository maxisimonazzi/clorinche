// Fluidez con las herramientas más pesadas y 3 dedos a la vez. Cuenta rAF en la página y mide el costo por cuadro.
import { launch, appUrl, multiStroke, shot } from '../lib.mjs';
import { ready, board, wave, T, resetDb } from './common.mjs';

const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
await page.goto(appUrl('pizarra'));
await ready(page);
await resetDb(page);
await page.reload();
await ready(page);
const api = T(page);
const b = await board(page);
const res = {};
for (const [tool, sz] of [['aerosol', 3], ['brillitos', 3], ['crayon', 3], ['lapiz', 2], ['sellos', 1], ['pincel', 3]]) {
  await api.tool(tool); await api.size(sz); await api.color('multi');
  await page.evaluate(() => {
    window.__f = []; let last = performance.now(); window.__on = true;
    const f = (now) => { window.__f.push(now - last); last = now; if (window.__on) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  const t0 = Date.now();
  while (Date.now() - t0 < 2000) {
    const y = 0.2 + Math.random() * 0.2;
    await multiStroke(page, [wave(b, y, 0.1, 0.9, 0.06), wave(b, y + 0.25, 0.9, 0.1, 0.06), wave(b, y + 0.45, 0.15, 0.85, -0.05)], { steps: 24, delay: 8 });
  }
  res[tool] = await page.evaluate(() => {
    window.__on = false;
    const f = window.__f.slice(2);
    const tot = f.reduce((a, b) => a + b, 0);
    const sorted = f.slice().sort((a, b) => a - b);
    return { fps: Math.round((f.length * 1000) / tot), p95ms: Math.round(sorted[Math.floor(sorted.length * 0.95)]) };
  });
}
await page.waitForTimeout(500);
await shot(page, `pizarra/perf-${size}`);
console.log(size, JSON.stringify(res), 'errores:', JSON.stringify(t.errors));
await t.close();
