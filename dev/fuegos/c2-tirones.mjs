// Revisión fuegos: ¿de dónde vienen los cuadros largos (tirones)? Explosiones por depuración (sin CDP),
// registro de cuadros > 40 ms y de cambios de resolución del canvas de efectos.
import { open } from '../review-fuegos/common.mjs';
const res = {};
for (const size of process.argv.slice(2).length ? process.argv.slice(2) : ['desktop', 'tablet', 'phone']) {
  const t = await open(size);
  const { page } = t;
  await page.evaluate(() => CL.sound.unlock()); await page.waitForTimeout(1500);
  res[size] = await page.evaluate(() => new Promise((done) => {
    const fx = document.querySelector('.fw-fx');
    const W = innerWidth, H = innerHeight;
    const log = [];
    let lastW = fx.width, last = performance.now(), n = 0, maxP = 0, qMin = 1;
    const t0 = performance.now();
    let k = 0;
    const iv = setInterval(() => {
      const ta = performance.now();
      CL.fuegos._debug.explode(W * (0.2 + Math.random() * 0.6), H * (0.25 + Math.random() * 0.45));
      const tb = performance.now();
      if (tb - ta > 8) log.push({ at: Math.round(ta - t0), explodeMs: Math.round(tb - ta) });
      if (++k >= 15) clearInterval(iv);
    }, 170);
    const f = (now) => {
      n++;
      const d = now - last; last = now;
      const s = CL.fuegos._debug.state();
      maxP = Math.max(maxP, s.particles); qMin = Math.min(qMin, s.quality);
      if (fx.width !== lastW) { log.push({ at: Math.round(now - t0), res: fx.width }); lastW = fx.width; }
      if (d > 40) log.push({ at: Math.round(now - t0), frameMs: Math.round(d), parts: s.particles });
      if (now - t0 < 3500) requestAnimationFrame(f);
      else done({ fps: +(n / ((now - t0) / 1000)).toFixed(1), maxP, qMin: +qMin.toFixed(2), log });
    };
    requestAnimationFrame(f);
  }));
  res[size].errors = t.errors;
  await t.close();
}
console.log(JSON.stringify(res));
