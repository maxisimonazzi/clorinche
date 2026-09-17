// QA pizarra: uso "de chico de 4 años".
import { open, S, board, at, wave, stroke, multiStroke, info, works, ready, click, tap } from './h.mjs';

const size = process.argv[2] || 'tablet';
const t = await open(size);
const { page } = t;
const touch = t.size.touch;
const ptr = touch ? 'touch' : 'mouse';
const out = { size };
const cdp = await page.context().newCDPSession(page);
const center = async (sel) => { const r = await page.locator(sel).first().boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; };
const tapXY = async (x, y) => { if (touch) await tap(page, x, y); else await page.mouse.click(x, y); };
const ink = () => page.evaluate(() => {
  const c = CL.pizarra.current._test.layer; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 8) n++; return n;
});
let b = await board(page);

// A) doble toque rápido en Sellos
const [sx, sy] = await center('.pz-tool[data-tool="sellos"]');
await tapXY(sx, sy); await page.waitForTimeout(80); await tapXY(sx, sy);
await page.waitForTimeout(450);
out.A_modalOpenAfterDoubleTap = await page.evaluate(() => !!document.querySelector('.modal-back'));
await S(page, `q/chaos/${size}-A-doubletap-sellos`);
if (out.A_modalOpenAfterDoubleTap) { await page.evaluate(() => document.querySelector('.modal-close').click()); await page.waitForTimeout(300); }

// B) toque en un sello del selector y enseguida toque en la pizarra (el modal todavía se está cerrando)
await tapXY(sx, sy); await page.waitForTimeout(350);
const [px, py] = await center('.pz-pick[aria-label="Gato"]');
await tapXY(px, py);
await page.waitForTimeout(40);
const [bx, by] = at(b, 0.5, 0.5);
await tapXY(bx, by);
await page.waitForTimeout(600);
out.B_stampAfterQuickTap = { stamp: (await info(page)).state.stamp, inkAfter: await ink() };
await S(page, `q/chaos/${size}-B-pick-then-tap`);

// C) dedo dibujando + otro dedo toca "Inicio" (solo táctil)
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('fibra'); T.selectColor('#ff3b30'); T.selectSize(3); });
if (touch) {
  const path = wave(b, 0.25, 0.1, 0.8);
  const [hx, hy] = await center('.btn-home');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: path[0][0], y: path[0][1], id: 1 }] });
  for (const [x, y] of path.slice(1)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] }); await page.waitForTimeout(16); }
  const inkDuring = await page.evaluate(() => {
    let n = 0;
    for (const c of [CL.pizarra.current._test.layer, ...document.querySelectorAll('.pz-live')]) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 16) if (d[i] > 8) n++; }
    return n;
  });
  const last = path[path.length - 1];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: last[0], y: last[1], id: 1 }, { x: hx, y: hy, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: last[0], y: last[1], id: 1 }] });
  await page.waitForTimeout(900);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(300);
  out.C_hash = await page.evaluate(() => location.hash);
  await page.evaluate(() => CL.router.go('pizarra')); await ready(page);
  out.C = { inkDuring, inkBack: await ink() };
}

// D) botón atrás del sistema en medio de un trazo
b = await board(page);
await page.evaluate(() => CL.router.go('inicio')); await page.waitForTimeout(500);
await page.evaluate(() => CL.router.go('pizarra')); await ready(page);
const inkD0 = await ink();
if (touch) {
  const path = wave(b, 0.55, 0.1, 0.9);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: path[0][0], y: path[0][1], id: 3 }] });
  for (const [x, y] of path.slice(1)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 3 }] }); await page.waitForTimeout(16); }
  await page.evaluate(() => history.back());
  await page.waitForTimeout(700);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
} else {
  await stroke(page, wave(b, 0.55, 0.1, 0.9), { steps: 12, release: false });
  await page.evaluate(() => history.back());
  await page.waitForTimeout(700);
  await page.mouse.up();
}
out.D_hash = await page.evaluate(() => location.hash);
await page.evaluate(() => CL.router.go('pizarra')); await ready(page);
out.D = { before: inkD0, after: await ink() };

// E) pestañas: tocar Neón, Fuegos, Pizarra muy rápido
const tabs = ['.mode-tab[aria-label="Neón"]', '.mode-tab[aria-label="Fuegos artificiales"]', '.mode-tab[aria-label="Pizarra mágica"]'];
for (let i = 0; i < 6; i++) {
  const sel = tabs[i % 3];
  const r = await page.locator(sel).first().boundingBox().catch(() => null);
  if (r) await tapXY(r.x + r.width / 2, r.y + r.height / 2);
  await page.waitForTimeout(120);
}
await page.waitForTimeout(1500);
out.E_hash = await page.evaluate(() => location.hash);
out.E_screens = await page.evaluate(() => document.querySelectorAll('#app > section').length);
await page.evaluate(() => CL.router.go('pizarra')); await ready(page);
out.E_inkKept = await ink();

// F) mantener el tacho mientras otro dedo dibuja (solo táctil)
if (touch) {
  b = await board(page);
  const [cx, cy] = await center('.pz-clear');
  const path = wave(b, 0.75, 0.1, 0.9);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 5 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 5 }, { x: path[0][0], y: path[0][1], id: 6 }] });
  for (let k = 1; k < path.length; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx, y: cy, id: 5 }, { x: path[k][0], y: path[k][1], id: 6 }] }); await page.waitForTimeout(140); }
  await page.waitForTimeout(250);
  await S(page, `q/chaos/${size}-F-hold-while-drawing`);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(1400);
  out.F = { ink: await ink(), info: (await info(page)).undo };
}

// G) ¡Terminé! con la pizarra vacía y doble toque en ¡Terminé! con dibujo
await page.evaluate(() => { const T = CL.pizarra.current._test; T.wipeMs = 30; T.wipe(); });
await page.waitForTimeout(400);
await click(t, '.pz-done', 200);
await S(page, `q/chaos/${size}-G-done-empty`);
out.G_emptyHash = await page.evaluate(() => location.hash);
b = await board(page);
await stroke(page, wave(b, 0.5), { pointer: ptr, steps: 12 });
const [dx, dy] = await center('.pz-done');
await tapXY(dx, dy); await page.waitForTimeout(60); await tapXY(dx, dy);
await page.waitForFunction(() => location.hash.startsWith('#obras/'), null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(600);
out.G_hash = await page.evaluate(() => location.hash);
out.G_works = await works(page);

// H) fugas: entrar y salir 6 veces y contar rAF/segundo y listeners de teclado en inicio
await page.evaluate(() => {
  window.__kd = 0; window.__raf = 0;
  const ae = window.addEventListener, re = window.removeEventListener;
  window.addEventListener = function (ty, ...r) { if (ty === 'keydown') window.__kd++; return ae.call(this, ty, ...r); };
  window.removeEventListener = function (ty, ...r) { if (ty === 'keydown') window.__kd--; return re.call(this, ty, ...r); };
  const o = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (f) => { window.__raf++; return o(f); };
});
for (let i = 0; i < 6; i++) {
  await page.evaluate(() => CL.router.go('pizarra')); await ready(page);
  b = await board(page);
  await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('brillitos'); });
  await stroke(page, wave(b, 0.2 + i * 0.1), { pointer: ptr, steps: 10 });
  await page.evaluate(() => CL.router.go('inicio')); await page.waitForTimeout(400);
}
await page.waitForTimeout(1200);
const r0 = await page.evaluate(() => window.__raf);
await page.waitForTimeout(1000);
out.H = { keydownNet: await page.evaluate(() => window.__kd), rafPerSecOnHome: (await page.evaluate(() => window.__raf)) - r0, modalLeft: await page.evaluate(() => document.querySelectorAll('.modal-back').length) };
out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
