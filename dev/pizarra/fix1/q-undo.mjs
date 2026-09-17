// QA pizarra: ¿deshacer deja la capa EXACTAMENTE como estaba? (un trazo por herramienta y tamaño)
import { open, S, board, at, wave, multiStroke, stroke, info, zoom } from './h.mjs';

const size = process.argv[2] || 'tablet';
const t = await open(size);
const { page } = t;
const b = await board(page);
const count = () => page.evaluate(() => {
  const c = CL.pizarra.current._test.layer;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let i = 3, p = 0; i < d.length; i += 4, p++) if (d[i] > 0) { n++; const x = p % c.width, y = (p / c.width) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { n, box: n ? [x0, y0, x1, y1] : null };
});
const res = [];
const cdp = await page.context().newCDPSession(page);
for (const [tool, sz] of [['aerosol', 3], ['aerosol', 1], ['brillitos', 3], ['sellos', 3], ['pincel', 3], ['crayon', 3], ['lapiz', 3], ['fibra', 3], ['arcoiris', 3]]) {
  await page.evaluate(([tl, sz]) => { const T = CL.pizarra.current._test; T.selectColor('#2f5bea'); T.selectTool(tl); T.selectSize(sz); }, [tool, sz]);
  if (await page.$('.modal-back')) { await page.evaluate(() => document.querySelector('.modal-close').click()); await page.waitForTimeout(250); }
  await page.waitForTimeout(100);
  const before = await count();
  if (tool === 'aerosol') {
    // chico apoyando el dedo quieto un rato y después moviendo
    const [x, y] = at(b, 0.5, 0.5);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 3 }] });
    await page.waitForTimeout(1500);
    for (let k = 1; k <= 10; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + k * 8, y, id: 3 }] }); await page.waitForTimeout(30); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await multiStroke(page, [wave(b, 0.5, 0.2, 0.8, 0.1, 8)], { steps: 30, delay: 12 });
  }
  await page.waitForTimeout(700);
  const mid = await count();
  if (tool === 'aerosol' && sz === 3) await zoom(page, 'q/undo/aerosol-before-undo', 0.25, 0.2, 0.5, 0.6, 1);
  await page.evaluate(() => CL.pizarra.current._test.undo());
  await page.waitForTimeout(300);
  const after = await count();
  if (after.n !== before.n) await zoom(page, `q/undo/${tool}-${sz}-after-undo`, 0.25, 0.2, 0.5, 0.6, 1);
  res.push({ tool, sz, before: before.n, drawn: mid.n, afterUndo: after.n, leftover: after.n - before.n, leftoverBox: after.box });
  // limpiar lo que quedó para la próxima prueba
  await page.evaluate(() => { const T = CL.pizarra.current._test; T.wipeMs = 30; T.wipe(); });
  await page.waitForTimeout(300);
}
console.log(JSON.stringify({ res, errors: t.errors }, null, 1));
await t.close();
