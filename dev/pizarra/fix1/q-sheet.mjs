// QA pizarra: lámina con un trazo de cada herramienta en varios fondos (tablet dpr 2) + recortes ampliados.
import { open, S, board, at, wave, stroke, multiStroke, info, zoom } from './h.mjs';

const size = process.argv[2] || 'tablet';
const bgs = (process.argv[3] || 'blanco,pizarron-verde,rosa,pizarron-negro').split(',');
const t = await open(size);
const { page } = t;
const tools = [
  ['lapiz', '#2f5bea', 2], ['fibra', '#ff3b30', 1], ['pincel', '#8b4dff', 2], ['crayon', '#1fb35a', 2],
  ['aerosol', '#ff8a1f', 1], ['arcoiris', null, 2], ['brillitos', '#ff78c4', 1], ['sellos', 'multi', 0],
];
const b = await board(page);
for (const bg of bgs) {
  await page.evaluate((bg) => CL.pizarra.current._test.setBg(bg), bg);
  for (let i = 0; i < tools.length; i++) {
    const [tl, c, sz] = tools[i];
    await page.evaluate(([tl, c, sz]) => { const T = CL.pizarra.current._test; if (c) T.selectColor(c); T.selectTool(tl); T.selectSize(sz); }, [tl, c, sz]);
    if (await page.$('.modal-back')) { await page.evaluate(() => document.querySelector('.modal-close').click()); await page.waitForTimeout(250); }
    const y = 0.07 + i * 0.118;
    await multiStroke(page, [wave(b, y, 0.06, 0.62, 0.03, 8)], { steps: 40, delay: 12 });
  }
  // repasar el lápiz y crayón sobre sí mismos (acumulación) y un cruce de fibra encima
  await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectColor('#2f5bea'); T.selectTool('lapiz'); T.selectSize(2); });
  await multiStroke(page, [wave(b, 0.07, 0.35, 0.62, 0.03, 6)], { steps: 30, delay: 12 });
  // aerosol quieto 1.2 s
  await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectColor('#19c8b9'); T.selectTool('aerosol'); T.selectSize(2); });
  const c = await page.context().newCDPSession(page);
  const [ax, ay] = at(b, 0.8, 0.12);
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: ax, y: ay, id: 9 }] });
  await page.waitForTimeout(1200);
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const [ax2, ay2] = at(b, 0.8, 0.32);
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: ax2, y: ay2, id: 9 }] });
  await page.waitForTimeout(150);
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  // pincel lento y rápido
  await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectColor('#ff3b30'); T.selectTool('pincel'); T.selectSize(2); });
  await multiStroke(page, [[at(b, 0.68, 0.45), at(b, 0.95, 0.5)]], { steps: 60, delay: 30 });
  await multiStroke(page, [[at(b, 0.68, 0.56), at(b, 0.95, 0.61)]], { steps: 5, delay: 4 });
  // goma cruzando todo
  await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('goma'); T.selectSize(1); });
  await multiStroke(page, [[at(b, 0.5, 0.03), at(b, 0.52, 0.97)]], { steps: 30, delay: 10 });
  await page.waitForTimeout(600);
  await S(page, `q/sheet/${size}-${bg}`);
  await zoom(page, `q/sheet/${size}-${bg}-z-lapiz`, 0.3, 0.02, 0.2, 0.12, 3);
  await zoom(page, `q/sheet/${size}-${bg}-z-fibra-pincel`, 0.06, 0.13, 0.22, 0.2, 3);
  await zoom(page, `q/sheet/${size}-${bg}-z-crayon-aerosol`, 0.06, 0.38, 0.22, 0.2, 3);
  await zoom(page, `q/sheet/${size}-${bg}-z-arco-brillo`, 0.06, 0.62, 0.22, 0.2, 3);
  await zoom(page, `q/sheet/${size}-${bg}-z-sellos`, 0.06, 0.86, 0.3, 0.14, 2);
  await zoom(page, `q/sheet/${size}-${bg}-z-pincel-vel`, 0.66, 0.4, 0.32, 0.26, 2);
  await zoom(page, `q/sheet/${size}-${bg}-z-aerosol-quieto`, 0.68, 0.02, 0.26, 0.4, 2);
  // limpiar para el siguiente fondo
  await page.evaluate(() => { const T = CL.pizarra.current._test; T.wipeMs = 50; T.wipe(); });
  await page.waitForTimeout(400);
}
console.log(JSON.stringify({ info: await info(page), errors: t.errors }));
await t.close();
