// Corrección 2 — ¿de dónde vienen los explode() de 8–12 ms que quedan? (búferes listos, sprites nuevos, GC)
import { launch, appUrl, tap } from '../lib.mjs';
const t = await launch({ size: process.argv[2] || 'tablet' });
const { page } = t;
await page.goto(appUrl('fuegos'));
await page.waitForTimeout(300);
await tap(page, 30, 400);
await page.waitForTimeout(1500);
const r = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const booms = CL.fuegos._debug.state().booms.length;
  const rows = [];
  for (let i = 0; i < 40; i++) {
    const type = CL.fuegos.TYPES[i % 9];
    const a = performance.now();
    CL.fuegos._debug.explode(300 + (i % 5) * 100, 350, type, i % 8);
    const ms = performance.now() - a;
    if (ms > 3) rows.push([i, type, i % 8, +ms.toFixed(1)]);
    await sleep(170);
  }
  return { booms, slow: rows };
});
console.log(JSON.stringify(r), t.errors);
await t.close();
