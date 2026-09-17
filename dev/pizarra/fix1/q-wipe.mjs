// QA pizarra: "borrar todo" con el holdButton real; barrita en 3 momentos; duración real; toque corto no borra.
import { open, S, board, at, wave, stroke, info, tap } from './h.mjs';

const size = process.argv[2] || 'tablet';
const slow = +(process.argv[3] || 2700);
const t = await open(size);
const { page } = t;
const ptr = t.size.touch ? 'touch' : 'mouse';
const out = { size };
const b = await board(page);
const tools = [['fibra', '#ff3b30'], ['crayon', '#2f5bea'], ['arcoiris', null], ['pincel', '#1fb35a'], ['brillitos', 'multi']];
for (let i = 0; i < tools.length; i++) {
  await page.evaluate(([tl, c]) => { const T = CL.pizarra.current._test; if (c) T.selectColor(c); T.selectTool(tl); T.selectSize(3); }, tools[i]);
  await stroke(page, wave(b, 0.12 + i * 0.19), { pointer: ptr, steps: 16 });
}
const cdp = await page.context().newCDPSession(page);
const r = await page.locator('.pz-clear').boundingBox();
const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
const press = async () => { if (t.size.touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 7 }] }); else { await page.mouse.move(cx, cy); await page.mouse.down(); } };
const release = async () => { if (t.size.touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await page.mouse.up(); };

// toque corto: no borra, muestra la manito
await press(); await page.waitForTimeout(250); await release();
await page.waitForTimeout(250);
await S(page, `q/wipe/${size}-0-short-tap-hint`);
out.shortTap = await info(page);

// medir la duración real (900 ms) registrando las posiciones de la barrita
await page.evaluate(() => {
  const w = document.querySelector('.pz-wiper');
  window.__wp = [];
  const f = (now) => { if (document.querySelector('.pz-board').classList.contains('pz-wiping')) window.__wp.push([Math.round(now), w.style.transform]); if (window.__wp.length < 400) requestAnimationFrame(f); };
  requestAnimationFrame(f);
});
if (slow) await page.evaluate((ms) => { CL.pizarra.current._test.wipeMs = ms; }, slow);
await press();
await page.waitForTimeout(1150);
await S(page, `q/wipe/${size}-1-holding`);
await page.waitForTimeout(150);
await release();
const d = slow || 900;
await page.waitForTimeout(Math.round(d * 0.2));
await S(page, `q/wipe/${size}-2-a`);
await page.waitForTimeout(Math.round(d * 0.25));
await S(page, `q/wipe/${size}-3-b`);
await page.waitForTimeout(Math.round(d * 0.25));
await S(page, `q/wipe/${size}-4-c`);
await page.waitForTimeout(d);
await S(page, `q/wipe/${size}-5-end`);
out.frames = await page.evaluate(() => { const a = window.__wp; return a.length ? { n: a.length, ms: a[a.length - 1][0] - a[0][0], first: a[0][1], last: a[a.length - 1][1] } : null; });
out.after = await info(page);
// deshacer el borrado
await page.evaluate(() => CL.pizarra.current._test.undo());
await page.waitForTimeout(300);
out.afterUndo = await info(page);
await S(page, `q/wipe/${size}-6-undo`);
out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
