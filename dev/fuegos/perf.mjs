// Fuegos: fps en reposo y con carga (cota inferior: headless sin GPU).
import { launch, appUrl } from '../lib.mjs';
const size = process.argv[2] || 'desktop';
const t = await launch({ size });
const { page } = t;
await page.goto(appUrl('fuegos'));
await page.waitForTimeout(800);
const fps = (ms) => page.evaluate((ms) => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = (now) => { n++; if (now - t0 < ms) requestAnimationFrame(f); else r(+(n / ((now - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); }), ms);
const out = { idle: await fps(1500) };
for (const n of [1, 3, 6]) {
  await page.evaluate(([n, W, H]) => { CL.fuegos._debug.clear(); for (let i = 0; i < n; i++) CL.fuegos._debug.explode(W * (0.2 + 0.6 * i / Math.max(1, n - 1)), H * 0.4, CL.fuegos.TYPES[i % 9]); }, [n, t.size.width, t.size.height]);
  out['boom' + n] = await fps(1200);
  out['boom' + n + 'q'] = await page.evaluate(() => { const s = CL.fuegos._debug.state(); return s.quality.toFixed(2) + ' p=' + s.particles + ' ' + JSON.stringify(s.timing, (k, v) => typeof v === 'number' ? +v.toFixed(2) : v); });
  await page.waitForTimeout(3000);
}
console.log(JSON.stringify(out), t.errors);
await t.close();
