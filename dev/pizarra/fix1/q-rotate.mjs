// QA pizarra: rotar / cambiar tamaño en medio del uso (y en medio de un trazo).
import { open, S, board, at, wave, stroke, multiStroke, info, ready } from './h.mjs';

const pair = process.argv[2] || 'tablet';
const [A, B] = pair === 'phone' ? [{ width: 390, height: 844 }, { width: 844, height: 390 }] : [{ width: 1024, height: 768 }, { width: 768, height: 1024 }];
const t = await open(pair);
const { page } = t;
const out = { pair };
const cdp = await page.context().newCDPSession(page);
const inkAt = (fx, fy, r = 6) => page.evaluate(([fx, fy, r]) => {
  const c = CL.pizarra.current._test.layer, d = CL.pizarra.current.doc;
  const x = Math.round(fx * c.width), y = Math.round(fy * c.height);
  const R = Math.round(r * d.res);
  const px = c.getContext('2d').getImageData(Math.max(0, x - R), Math.max(0, y - R), 2 * R, 2 * R).data;
  let n = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 20) n++;
  return n;
}, [fx, fy, r]);

// 0) pizarra vacía: rotar rehace el documento al tamaño nuevo
out.blank0 = (await info(page)).doc;
await page.setViewportSize(B); await page.waitForTimeout(600);
out.blankRot = (await info(page)).doc;
await S(page, `q/rotate/${pair}-0-blank-rotated`);
await page.setViewportSize(A); await page.waitForTimeout(600);

// 1) dibujar y rotar
let b = await board(page);
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('fibra'); T.selectColor('#ff3b30'); T.selectSize(2); });
await stroke(page, wave(b, 0.3), { pointer: 'touch', steps: 16 });
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('sellos'); T.selectColor('multi'); });
if (await page.$('.modal-back')) { await page.evaluate(() => document.querySelector('.modal-close').click()); await page.waitForTimeout(250); }
await stroke(page, [at(b, 0.15, 0.7), at(b, 0.85, 0.7)], { pointer: 'touch', steps: 16 });
await page.waitForTimeout(400);
await page.setViewportSize(B); await page.waitForTimeout(700);
out.rot1 = await info(page);
await S(page, `q/rotate/${pair}-1-rotated`);

// 2) trazo que empieza, rotación en el medio, y sigue: ¿la tinta cae donde está el dedo?
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('fibra'); T.selectColor('#2f5bea'); T.selectSize(3); });
b = await board(page);
let [x0, y0] = at(b, 0.3, 0.5);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0, id: 4 }] });
for (let k = 1; k <= 5; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + k * 6, y: y0, id: 4 }] }); await page.waitForTimeout(16); }
await page.setViewportSize(A); await page.waitForTimeout(500);
b = await board(page);
// el dedo se mueve hasta (0.5, 0.15) del tablero NUEVO
const [tx, ty] = at(b, 0.5, 0.15);
for (let k = 1; k <= 12; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (tx - x0) * k / 12, y: y0 + (ty - y0) * k / 12, id: 4 }] }); await page.waitForTimeout(16); }
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(400);
const fx = (tx - b.x) / b.width, fy = (ty - b.y) / b.height;
out.midStroke = { fingerEndFrac: [fx.toFixed(3), fy.toFixed(3)], inkUnderFinger: await inkAt(fx, fy) };
await S(page, `q/rotate/${pair}-2-midstroke`);
await page.setViewportSize(B); await page.waitForTimeout(600);
await S(page, `q/rotate/${pair}-3-back`);
// 3) recargar en la otra orientación
await page.waitForTimeout(1500);
await page.reload(); await ready(page);
out.reloadRot = await info(page);
await S(page, `q/rotate/${pair}-4-reload`);
out.errors = t.errors;
console.log(JSON.stringify(out));
await t.close();
