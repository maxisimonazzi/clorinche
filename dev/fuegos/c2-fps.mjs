// Revisión fuegos: fps en uso realista (toques de chico cada 200 ms durante 3 s + 2 dedos dibujando).
import { tap, touchStart, touches } from '../lib.mjs';
import { open, st } from '../review-fuegos/common.mjs';
const res = {};
for (const size of (process.argv.slice(2).length ? process.argv.slice(2) : ['desktop', 'tablet', 'tabletV', 'phone', 'phoneH'])) {
  const t = await open(size);
  const { page } = t;
  const W = t.size.width, H = t.size.height;
  await page.waitForTimeout(1500);
  const idle = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = (now) => { n++; if (now - t0 < 1500) requestAnimationFrame(f); else r(+(n / ((now - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); }));
  await page.evaluate(() => { window.__fps = { n: 0, worst: 0, maxP: 0, t0: performance.now(), last: performance.now(), on: true };
    const f = (now) => { const s = window.__fps; if (!s.on) return; s.n++; s.worst = Math.max(s.worst, now - s.last); s.last = now; s.maxP = Math.max(s.maxP, CL.fuegos._debug.state().particles); requestAnimationFrame(f); }; requestAnimationFrame(f); });
  for (let i = 0; i < 15; i++) {
    const x = W * (0.2 + Math.random() * 0.6), y = H * (0.25 + Math.random() * 0.45);
    if (t.size.touch) await tap(page, x, y); else await page.mouse.click(x, y);
    await page.waitForTimeout(170);
  }
  const r = await page.evaluate(() => { const s = window.__fps; s.on = false; const q = CL.fuegos._debug.state(); return { fps: +(s.n / ((performance.now() - s.t0) / 1000)).toFixed(1), worstMs: Math.round(s.worst), maxP: s.maxP, quality: +q.quality.toFixed(2), fdpr: q.fdpr, timing: Object.fromEntries(Object.entries(q.timing).map(([k, v]) => [k, +v.toFixed(2)])) }; });
  res[size] = { idleFps: idle, ...r, errors: t.errors };
  await t.close();
}
console.log(JSON.stringify(res, null, 1));
