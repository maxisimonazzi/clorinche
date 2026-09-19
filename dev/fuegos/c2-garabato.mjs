// Revisión fuegos: garabato rápido de chico (eventos de puntero sintéticos con tiempo real) y
// velocidad de la chispa antes y después de soltar. Capturas del garabato soltado.
import { shot } from '../lib.mjs';
import { open } from '../review-fuegos/common.mjs';
const size = process.argv[2] || 'tablet';
const t = await open(size);
const { page } = t;
const out = await page.evaluate(() => new Promise((done) => {
  const fx = document.querySelector('.fw-fx');
  const W = innerWidth, H = innerHeight;
  const ev = (type, x, y) => fx.dispatchEvent(new PointerEvent(type, { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true }));
  const cx = W / 2, cy = H / 2;
  const t0 = performance.now();
  ev('pointerdown', cx - 150, cy);
  const samples = [];
  let released = false, tRel = 0;
  const f = () => {
    const now = performance.now();
    const tt = (now - t0) / 1000;
    const s = CL.fuegos._debug.state();
    if (s.fuses[0]) samples.push([+(tt).toFixed(3), Math.round(s.fuses[0].sd), Math.round(s.fuses[0].len)]);
    if (!released) {
      // vaivén de 300 px, 3 idas y vueltas por segundo (~1800 px/s), bajando despacio
      const x = cx + 150 * Math.sin(tt * Math.PI * 2 * 3 - Math.PI / 2);
      const y = cy - 80 + tt * 50 + 20 * Math.sin(tt * 5);
      ev('pointermove', x, y);
      if (tt >= 3) { ev('pointerup', x, y); released = true; tRel = tt; }
    }
    if (!s.fuses.length && released) {
      done({ tRel, boomAfterSec: +(tt - tRel).toFixed(2), samples: samples.filter((_, i) => i % 6 === 0) });
      return;
    }
    requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
}));
// velocidades por tramo
const sp = [];
for (let i = 1; i < out.samples.length; i++) {
  const [ta, da] = out.samples[i - 1], [tb, db] = out.samples[i];
  sp.push([+tb.toFixed(2), Math.round((db - da) / (tb - ta))]);
}
console.log(JSON.stringify({ size, tRel: out.tRel, boomAfterSec: out.boomAfterSec, lenAtRelease: out.samples.find((s) => s[0] >= out.tRel)?.[2], speeds: sp }));
// captura del garabato en el momento de soltar (repetición congelada)
await page.evaluate(() => CL.fuegos._debug.clear());
await page.evaluate(() => {
  const fx = document.querySelector('.fw-fx');
  const W = innerWidth, H = innerHeight;
  const ev = (type, x, y) => fx.dispatchEvent(new PointerEvent(type, { pointerId: 10, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true }));
  CL.fuegos._debug.timeScale(0);
  const cx = W / 2, cy = H / 2;
  ev('pointerdown', cx - 150, cy);
  for (let k = 0; k <= 180; k++) { const tt = k / 60; ev('pointermove', cx + 150 * Math.sin(tt * Math.PI * 6 - Math.PI / 2), cy - 80 + tt * 50 + 20 * Math.sin(tt * 5)); }
  ev('pointerup', cx, cy + 70);
  CL.fuegos._debug.timeScale(1);
});
await page.waitForTimeout(1200);
await shot(page, `fuegos/c2-garabato-${size}-garabato-soltado`);
console.log(JSON.stringify(t.errors));
await t.close();
