// Borrar todo a velocidad real (0,9 s) con el holdButton de verdad; capturas en 3 momentos.
// También: 3 dedos a la vez, tocar el tacho rápido (no debe borrar), y dibujar durante la barrita.
import { open, S, board, at, wave, stroke, multiStroke, info, inked, tap, click } from './h.mjs';

const size = process.argv[2] || 'tablet';
const t = await open(size);
const { page } = t;
const out = { size };
const b = await board(page);
await page.evaluate(() => { CL.pizarra.current._test.selectTool('crayon'); CL.pizarra.current._test.selectSize(3); });
// 3 dedos a la vez
if (t.size.touch) {
  await multiStroke(page, [wave(b, 0.25, 0.06, 0.94, 0.08), wave(b, 0.5, 0.06, 0.94, -0.08), wave(b, 0.75, 0.06, 0.94, 0.08)], { steps: 40, delay: 14 });
} else {
  for (const y of [0.25, 0.5, 0.75]) await stroke(page, wave(b, y, 0.06, 0.94, 0.08), { steps: 40 });
}
await page.waitForTimeout(300);
out.after3 = await info(page);
out.ink3 = await inked(page);
await S(page, `wipe/${size}-0-three-fingers`);

// Toque corto en el tacho: no borra, se sacude
await click(t, '.pz-clear', 300);
await S(page, `wipe/${size}-1-short-tap-hint`);
out.inkAfterTap = await inked(page);

// Mantener apretado (dedo real si es touch)
const cb = await page.locator('.pz-clear').boundingBox();
const cx = cb.x + cb.width / 2, cy = cb.y + cb.height / 2;
if (t.size.touch) {
  const c = await page.context().newCDPSession(page);
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 9 }] });
  await page.waitForFunction(() => document.querySelector('.pz-board').classList.contains('pz-wiping'), null, { timeout: 4000, polling: 5 });
  out.wipeStartedAt = Date.now();
  const shots = [];
  for (const [k, ms] of [['a', 180], ['b', 430], ['c', 680]]) {
    const w = ms - (Date.now() - out.wipeStartedAt);
    if (w > 0) await page.waitForTimeout(w);
    const tr = await page.evaluate(() => document.querySelector('.pz-wiper').style.transform);
    await S(page, `wipe/${size}-2-${k}`);
    shots.push(k + '@' + (Date.now() - out.wipeStartedAt) + 'ms ' + tr);
  }
  out.shots = shots;
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
} else {
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForFunction(() => document.querySelector('.pz-board').classList.contains('pz-wiping'), null, { timeout: 4000, polling: 5 });
  out.wipeStartedAt = Date.now();
  const shots = [];
  for (const [k, ms] of [['a', 180], ['b', 430], ['c', 680]]) {
    const w = ms - (Date.now() - out.wipeStartedAt);
    if (w > 0) await page.waitForTimeout(w);
    const tr = await page.evaluate(() => document.querySelector('.pz-wiper').style.transform);
    await S(page, `wipe/${size}-2-${k}`);
    shots.push(k + '@' + (Date.now() - out.wipeStartedAt) + 'ms ' + tr);
  }
  out.shots = shots;
  await page.mouse.up();
}
await page.waitForTimeout(800);
out.afterWipe = await info(page);
out.inkAfterWipe = await inked(page);
await S(page, `wipe/${size}-3-after`);
await page.waitForTimeout(1200);
out.worksAfterWipe = await page.evaluate(async () => (await CL.db.works.list({ kind: 'pizarra' })).length);
out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
