// QA pizarra: 3 dedos a la vez, "palma" de 10 dedos (memoria de lienzos), y fps dibujando con cada herramienta.
import { open, S, board, at, wave, multiStroke, info } from './h.mjs';

const size = process.argv[2] || 'tablet';
const t = await open(size);
const { page } = t;
const out = { size };
let b = await board(page);
const cdp = await page.context().newCDPSession(page);

// 3 dedos con crayón
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('crayon'); T.selectColor('multi'); T.selectSize(2); });
await multiStroke(page, [wave(b, 0.2, 0.1, 0.9), wave(b, 0.45, 0.1, 0.9), wave(b, 0.7, 0.1, 0.9)], { steps: 30, delay: 16 });
await page.waitForTimeout(400);
out.after3 = { undo: (await info(page)).undo };
await S(page, `q/multi/${size}-3dedos`);

// medir memoria de lienzos: cantidad y megapíxeles de todos los canvas del tablero después de una "palma" de 10 dedos
const canvasMem = () => page.evaluate(() => {
  const cs = [...document.querySelectorAll('.pz-board canvas')];
  const px = cs.reduce((a, c) => a + c.width * c.height, 0);
  return { n: cs.length, live: document.querySelectorAll('.pz-live').length, MB: Math.round((px * 4) / 1e6) };
});
out.memBefore = await canvasMem();
const pts = Array.from({ length: 10 }, (_, i) => ({ x: at(b, 0.2 + (i % 5) * 0.14, 0.4 + Math.floor(i / 5) * 0.2)[0], y: at(b, 0.2 + (i % 5) * 0.14, 0.4 + Math.floor(i / 5) * 0.2)[1], id: 20 + i }));
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts });
for (let k = 1; k < 8; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts.map((p) => ({ ...p, x: p.x + k * 3, y: p.y + k * 2 })) }); await page.waitForTimeout(16); }
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(300);
out.memAfterPalm = await canvasMem();
out.memNote = 'los lienzos de .pz-live (y sus lienzos ocultos de forma para lápiz/crayón, no están en el DOM) quedan en el pool hasta rehacer el documento';
out.shapeCanvases = await page.evaluate(() => 'ver código: lv.shape por cada lienzo en vivo con textura');

// fps con 3 dedos durante ~2 s por herramienta
out.fps = {};
for (const tool of ['lapiz', 'fibra', 'pincel', 'crayon', 'aerosol', 'arcoiris', 'brillitos', 'sellos', 'goma']) {
  await page.evaluate((tl) => { const T = CL.pizarra.current._test; T.selectTool(tl); T.selectColor('#2f5bea'); T.selectSize(2); }, tool);
  if (await page.$('.modal-back')) { await page.evaluate(() => document.querySelector('.modal-close').click()); await page.waitForTimeout(250); }
  await page.evaluate(() => {
    window.__f = []; window.__run = true;
    const f = (now) => { window.__f.push(now); if (window.__run) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  await multiStroke(page, [wave(b, 0.25, 0.08, 0.92, 0.1, 12), wave(b, 0.5, 0.92, 0.08, 0.1, 12), wave(b, 0.75, 0.08, 0.92, 0.1, 12)], { steps: 110, delay: 16 });
  const r = await page.evaluate(() => {
    window.__run = false;
    const a = window.__f; const d = []; for (let i = 1; i < a.length; i++) d.push(a[i] - a[i - 1]);
    d.sort((x, y) => x - y);
    return { fps: Math.round((a.length - 1) / ((a[a.length - 1] - a[0]) / 1000)), p95: Math.round(d[Math.floor(d.length * 0.95)]), max: Math.round(d[d.length - 1]) };
  });
  out.fps[tool] = r;
  await page.evaluate(() => { const T = CL.pizarra.current._test; T.wipeMs = 30; T.wipe(); });
  await page.waitForTimeout(250);
}
out.errors = t.errors;
console.log(JSON.stringify(out));
await t.close();
