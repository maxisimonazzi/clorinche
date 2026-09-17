// Palma de 10 dedos con crayón: cuántos trazos dibujan a la vez y cuántos lienzos quedan retenidos.
import { open, board, at, S } from './h.mjs';
const size = process.argv[2] || 'tablet';
const t = await open(size);
const { page } = t;
const b = await board(page);
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('crayon'); T.selectSize(2); });
const cdp = await page.context().newCDPSession(page);
const pts = Array.from({ length: 10 }, (_, i) => { const [x, y] = at(b, 0.1 + (i % 5) * 0.18, 0.3 + Math.floor(i / 5) * 0.35); return { x, y, id: 30 + i }; });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts });
for (let k = 1; k < 10; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts.map((p) => ({ ...p, x: p.x + k * 5, y: p.y + k * 3 })) }); await page.waitForTimeout(20); }
const during = await page.evaluate(() => ({ liveVisible: document.querySelectorAll('.pz-live:not([hidden])').length }));
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(500);
const after = await page.evaluate(() => ({ liveInDom: document.querySelectorAll('.pz-live').length, boardCanvases: document.querySelectorAll('.pz-board canvas').length }));
await S(page, `palm-${size}`);
console.log(JSON.stringify({ size, during, after, errors: t.errors.filter((e) => !/selva/.test(e)) }));
await t.close();
