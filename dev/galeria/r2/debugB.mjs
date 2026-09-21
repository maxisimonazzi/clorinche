// Depuración del caso B (dos dedos) y del toque siguiente.
import { launch, appUrl, tap, touchStart } from '../../lib.mjs';
import { state, dbWorks, instrument, seedSynthetic, center } from './lib.mjs';
const t = await launch({ size: process.argv[2] || 'tablet' });
const { page } = t;
await page.addInitScript(instrument);
await page.goto(appUrl('inicio'));
await page.waitForTimeout(700);
await seedSynthetic(page, { done: 14, progress: 4 });
await page.evaluate(() => CL.router.go('obras'));
await page.waitForTimeout(1300);
await page.evaluate(() => {
  window.__log = [];
  for (const ty of ['pointerdown', 'pointerup', 'pointercancel', 'click', 'lostpointercapture', 'gotpointercapture'])
    document.addEventListener(ty, (e) => window.__log.push(ty + ':' + e.pointerId + ':' + (e.target.className && (e.target.className.baseVal ?? e.target.className)).toString().slice(0, 30)), true);
});
const [x, y] = await center(page, '.gal-card >> nth=1');
await tap(page, x, y); await page.waitForTimeout(700);
const [bx, by] = await center(page, '.gv-del');
const c = await page.context().newCDPSession(page);
await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bx, y: by, id: 1 }] });
await page.waitForTimeout(250);
await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bx, y: by, id: 1 }, { x: 8, y: 8, id: 2 }] });
await page.waitForTimeout(80);
console.log('con 2 dedos', JSON.stringify(await state(page)));
await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: bx, y: by, id: 1 }] });
await page.waitForTimeout(150);
console.log('solto dedo 2', JSON.stringify(await state(page)));
await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(1800);
console.log('solto todo', JSON.stringify(await state(page)), (await dbWorks(page)).length);
console.log(await page.evaluate(() => window.__log.join('\n')));
await page.evaluate(() => { window.__log = []; });
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
const [x2, y2] = await center(page, '.gal-card >> nth=2');
await tap(page, x2, y2); await page.waitForTimeout(700);
console.log('tras tocar otra', JSON.stringify(await state(page)));
console.log(await page.evaluate(() => window.__log.join('\n')));
await t.close();
