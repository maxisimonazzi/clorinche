// QA pizarra: lápiz óptico con presión + rechazo de palma mientras el lápiz está apoyado.
import { open, S, board, at, zoom } from './h.mjs';

const t = await open('tablet');
const { page } = t;
const cdp = await page.context().newCDPSession(page);
const b = await board(page);
const ink = () => page.evaluate(() => {
  const c = CL.pizarra.current._test.layer; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 8) n++; return n;
});
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('fibra'); T.selectColor('#8b4dff'); T.selectSize(2); });
const pen = (type, x, y, force) => cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, pointerType: 'pen', force });
const [x0, y0] = at(b, 0.1, 0.3), [x1] = at(b, 0.9, 0.3);
await pen('mousePressed', x0, y0, 0.05);
for (let k = 1; k <= 40; k++) { await pen('mouseMoved', x0 + (x1 - x0) * k / 40, y0, 0.05 + 0.95 * k / 40); await page.waitForTimeout(12); }
await pen('mouseReleased', x1, y0, 0);
await page.waitForTimeout(300);
const inkPen = await ink();
// palma: lápiz apoyado y un dedo tocando/moviéndose al mismo tiempo
const [px, py] = at(b, 0.2, 0.7), [hx, hy] = at(b, 0.5, 0.8);
await pen('mousePressed', px, py, 0.5);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: hx, y: hy, id: 1 }] });
for (let k = 1; k <= 15; k++) {
  await pen('mouseMoved', px + k * 6, py, 0.5);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: hx + k * 10, y: hy, id: 1 }] });
  await page.waitForTimeout(12);
}
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await pen('mouseReleased', px + 90, py, 0);
await page.waitForTimeout(300);
await S(page, 'q/pen/tablet-pressure-palm');
await zoom(page, 'q/pen/tablet-pressure-zoom', 0.05, 0.2, 0.9, 0.7, 1);
const palmInk = await page.evaluate(([fx, fy]) => {
  const c = CL.pizarra.current._test.layer; const x = c.getContext('2d');
  const d = x.getImageData(Math.round(fx * c.width), Math.round(fy * c.height) - 20, Math.round(0.3 * c.width), 40).data;
  let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++; return n;
}, [0.52, 0.8]);
console.log(JSON.stringify({ inkPen, palmInkUnderFinger: palmInk, errors: t.errors }));
await t.close();
