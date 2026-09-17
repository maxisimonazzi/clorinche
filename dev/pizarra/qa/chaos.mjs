// Uso "de chico de 4 años": dedos torpes, toques repetidos, salir en medio de un trazo, etc.
// node review-pizarra/chaos.mjs [tamaño]
import { open, S, board, at, wave, stroke, multiStroke, info, inked, works, ready, click, tap, appUrl } from './h.mjs';

const size = process.argv[2] || 'tablet';
const t = await open(size);
const { page } = t;
const out = { size };
const touch = t.size.touch;
const cdp = await page.context().newCDPSession(page);
const center = async (sel) => { const r = await page.locator(sel).first().boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; };
const liveInk = () => page.evaluate(() => {
  let n = 0;
  for (const c of [CL.pizarra.current._test.layer, ...document.querySelectorAll('.pz-live')]) {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 16) if (d[i] > 8) n++;
  }
  return n;
});

let b = await board(page);
await page.evaluate(() => { CL.pizarra.current._test.selectTool('fibra'); CL.pizarra.current._test.selectSize(3); });

// S1: un dedo dibuja, otro dedo toca "Inicio" mientras tanto. ¿Se guarda el trazo en curso?
await stroke(page, wave(b, 0.25), { pointer: touch ? 'touch' : 'mouse', steps: 20 });
await page.waitForTimeout(2500); // primer trazo ya guardado
if (touch) {
  const path = wave(b, 0.6, 0.1, 0.8);
  const [hx, hy] = await center('.btn-home');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: path[0][0], y: path[0][1], id: 1 }] });
  for (const [x, y] of path.slice(1)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] }); await page.waitForTimeout(15); }
  out.s1_inkWhileDrawing = await liveInk();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: path.at(-1)[0], y: path.at(-1)[1], id: 1 }, { x: hx, y: hy, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: path.at(-1)[0], y: path.at(-1)[1], id: 1 }] });
  await page.waitForTimeout(700);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
} else {
  await stroke(page, wave(b, 0.6, 0.1, 0.8), { steps: 20, release: false });
  out.s1_inkWhileDrawing = await liveInk();
  await page.evaluate(() => CL.router.go('inicio'));
  await page.waitForTimeout(700);
  await page.mouse.up();
}
out.s1_hash = await page.evaluate(() => location.hash);
await page.evaluate(() => CL.router.go('pizarra'));
await ready(page);
out.s1_inkBack = await inked(page);
out.s1_strokeLost = out.s1_inkBack < out.s1_inkWhileDrawing * 0.9;
await S(page, `chaos/${size}-s1-back`);

// S2: doble toque rápido en "Sellos" (el 2º toque cae en el fondo oscuro del selector)
const [sx, sy] = await center('.pz-tool[data-tool="sellos"]');
if (touch) { await tap(page, sx, sy); await page.waitForTimeout(90); await tap(page, sx, sy); }
else { await page.mouse.click(sx, sy); await page.waitForTimeout(90); await page.mouse.click(sx, sy); }
await page.waitForTimeout(400);
out.s2_pickerOpenAfterDoubleTap = await page.evaluate(() => !!document.querySelector('.modal-back.pz-modal'));
await S(page, `chaos/${size}-s2-doubletap-sellos`);
if (out.s2_pickerOpenAfterDoubleTap) await page.evaluate(() => document.querySelector('.modal-close').click());
await page.waitForTimeout(300);

// S3: toques rápidos en todas las herramientas, colores y grosores (60 toques)
const sels = await page.evaluate(() => [...document.querySelectorAll('.pz-tool, .pz-swatch, .pz-size')].filter((e) => e.dataset.tool !== 'sellos').map((e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }));
for (let i = 0; i < 60; i++) {
  const [x, y] = sels[(i * 7) % sels.length];
  if (touch) await tap(page, x, y); else await page.mouse.click(x, y);
  await page.waitForTimeout(25);
}
out.s3_state = (await info(page)).state;

// S4: deshacer 20 veces seguidas
for (let i = 0; i < 20; i++) await click(t, '.pz-undo', 30);
out.s4 = await info(page);

// S5: dibujar con un dedo mientras otro mantiene apretado el tacho
await page.evaluate(() => { CL.pizarra.current._test.selectTool('crayon'); CL.pizarra.current._test.selectColor('#2f5bea'); });
b = await board(page);
await stroke(page, wave(b, 0.4), { pointer: touch ? 'touch' : 'mouse', steps: 16 });
await page.waitForTimeout(300);
if (touch) {
  const [tx, ty] = await center('.pz-clear');
  const path = wave(b, 0.7, 0.1, 0.9);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty, id: 5 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty, id: 5 }, { x: path[0][0], y: path[0][1], id: 6 }] });
  for (let k = 1; k < path.length; k++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx, y: ty, id: 5 }, { x: path[k][0], y: path[k][1], id: 6 }] });
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(200);
  await S(page, `chaos/${size}-s5-hold-while-drawing`);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(1300);
  out.s5 = { ink: await inked(page), info: await info(page) };
}

// S6: "¡Terminé!" con doble toque
await stroke(page, wave(b, 0.5), { pointer: touch ? 'touch' : 'mouse', steps: 16 });
await page.waitForTimeout(200);
const [dx, dy] = await center('.pz-done');
if (touch) { await tap(page, dx, dy); await page.waitForTimeout(60); await tap(page, dx, dy); }
else { await page.mouse.click(dx, dy); await page.waitForTimeout(60); await page.mouse.click(dx, dy); }
await page.waitForFunction(() => location.hash.startsWith('#obras'), null, { timeout: 12000 }).catch(() => {});
await page.waitForTimeout(800);
out.s6_hash = await page.evaluate(() => location.hash);
out.s6_works = await works(page);
out.s6_historyLen = await page.evaluate(() => history.length);
await S(page, `chaos/${size}-s6-after-done`);

// S7: fugas: entrar y salir 6 veces; luego en inicio contar rAF y keydown
await page.evaluate(() => {
  window.__kd = 0; window.__raf = 0;
  const ae = window.addEventListener, re = window.removeEventListener;
  window.addEventListener = function (ty, ...r) { if (ty === 'keydown') window.__kd++; return ae.call(this, ty, ...r); };
  window.removeEventListener = function (ty, ...r) { if (ty === 'keydown') window.__kd--; return re.call(this, ty, ...r); };
  const o = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (f) => { window.__raf++; return o(f); };
});
for (let i = 0; i < 6; i++) {
  await page.evaluate(() => CL.router.go('pizarra'));
  await ready(page);
  b = await board(page);
  await stroke(page, wave(b, 0.2 + i * 0.1), { pointer: touch ? 'touch' : 'mouse', steps: 10 });
  await page.evaluate(() => CL.router.go('inicio'));
  await page.waitForTimeout(500);
}
await page.waitForTimeout(1000);
const r0 = await page.evaluate(() => window.__raf);
await page.waitForTimeout(1000);
out.s7 = { keydownNet: await page.evaluate(() => window.__kd), rafPerSecOnHome: (await page.evaluate(() => window.__raf)) - r0, liveCanvasesInDom: await page.evaluate(() => document.querySelectorAll('canvas').length) };

// S8: "¡Terminé!" apenas se entra (la carga desde IndexedDB demorada a propósito)
await page.evaluate(() => {
  const o = CL.db.works.findProgress;
  CL.db.works.findProgress = async (...a) => { await new Promise((r) => setTimeout(r, 1500)); return o(...a); };
});
await page.evaluate(() => CL.router.go('pizarra'));
await page.waitForTimeout(300);
await click(t, '.pz-done', 100);
await click(t, '.pz-undo', 100);
await page.waitForTimeout(2500);
out.s8_hash = await page.evaluate(() => location.hash);

out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
