import { launch, appUrl, stroke } from '../../lib.mjs';
import { board, wave, ready } from './h.mjs';
const probe = () => new Promise((res) => { const c = document.createElement('canvas'); c.width = 200; c.height = 200; c.getContext('2d').fillRect(0,0,10,10); const t0 = performance.now(); c.toBlob(() => res(Math.round(performance.now() - t0))); });
const t = await launch({ size: 'tablet' });
const { page } = t;
await page.addInitScript(() => {
  window.__raf = 0;
  const o = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (f) => { window.__raf++; return o(f); };
});
await page.goto(appUrl('pizarra')); await ready(page);
console.log('fresh', await page.evaluate(probe));
const b = await board(page);
await stroke(page, wave(b, 0.3), { pointer: 'mouse', steps: 20 });
await page.waitForTimeout(1500);
console.log('after mouse', await page.evaluate(probe));
await stroke(page, wave(b, 0.5), { pointer: 'touch', steps: 20 });
for (const w of [100, 1500, 4000]) {
  await page.waitForTimeout(w);
  const r0 = await page.evaluate(() => window.__raf);
  const p = await page.evaluate(probe);
  const r1 = await page.evaluate(() => window.__raf);
  console.log('after touch +' + w, p, 'raf calls during probe', r1 - r0);
}
// un toque cualquiera fuera del tablero
const c = await page.context().newCDPSession(page);
await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 500, y: 20, id: 1 }] });
await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(500);
console.log('after tap on topbar', await page.evaluate(probe));
await t.close();
