// Revisión fuegos: garabato rapidísimo de 10 s con el dedo apoyado (mecha muy larga sin quemar):
// ¿cuántos puntos, cuánto cuesta dibujarla por cuadro y qué fps quedan?
import { shot } from '../lib.mjs';
import { open } from '../review-fuegos/common.mjs';
const size = process.argv[2] || 'tablet';
const t = await open(size);
const { page } = t;
const out = await page.evaluate(() => new Promise((done) => {
  const fx = document.querySelector('.fw-fx');
  const W = innerWidth, H = innerHeight;
  const ev = (type, x, y) => fx.dispatchEvent(new PointerEvent(type, { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true }));
  const t0 = performance.now();
  ev('pointerdown', W * 0.2, H * 0.3);
  let frames = 0, worst = 0, last = t0, fr8 = 0, t8 = 0;
  const f = (now) => {
    frames++; worst = Math.max(worst, now - last); last = now;
    const tt = (now - t0) / 1000;
    // 4 subeventos por cuadro (como coalesced de una pantalla de 240 Hz), vaivén ancho
    for (let k = 0; k < 4; k++) {
      const u = tt + k / 240;
      ev('pointermove', W * (0.5 + 0.3 * Math.sin(u * Math.PI * 2 * 2.5)), H * (0.3 + 0.4 * (0.5 + 0.5 * Math.sin(u * 1.3))));
    }
    if (tt > 8 && !t8) { t8 = now; fr8 = frames; }
    if (tt < 10) requestAnimationFrame(f);
    else {
      const s = CL.fuegos._debug.state();
      done({ fpsLast2s: +((frames - fr8) / ((now - t8) / 1000)).toFixed(1), worstMs: Math.round(worst), len: Math.round(s.fuses[0].len), burned: Math.round(s.fuses[0].sd), timing: s.timing, fdpr: s.fdpr, quality: +s.quality.toFixed(2) });
    }
  };
  requestAnimationFrame(f);
}));
await shot(page, `fuegos/c2-garabato-largo-${size}-garabato-largo`);
console.log(JSON.stringify(out), JSON.stringify(t.errors));
await t.close();
