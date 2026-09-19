// Corrección 1 — obra terminada + "atrás" + "Borrar todo" (antes la pisaba con una pizarra vacía).
// node neon/fix-atras.mjs [size]
import { launch, appUrl, shot, multiStroke, rect } from '../lib.mjs';

const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
const ok = [];
const check = (cond, msg) => { ok.push((cond ? 'OK   ' : 'FALLA') + ' ' + msg); };
const ready = () => page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
const works = () => page.evaluate(async () => (await CL.db.works.list({ kind: 'neon' })).map((w) => ({ id: w.id, st: w.status, bytes: w.paint.size, type: w.paint.type, w: w.w, h: w.h })));
const cdp = await page.context().newCDPSession(page);
async function holdClear(ms = 1350) {
  const cb = await rect(page, '.neon-clear');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cb.x + cb.width / 2, y: cb.y + cb.height / 2, id: 9 }] });
  await page.waitForTimeout(ms);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
const wave = (r, fy, amp = 0.15) => { const p = []; for (let i = 0; i <= 30; i++) p.push([r.x + r.width * (0.15 + 0.7 * i / 30), r.y + r.height * (fy + amp * Math.sin(i / 3))]); return p; };

await page.goto(appUrl('inicio'));
await page.waitForTimeout(300);
await page.goto(appUrl('neon'));
await ready();
let r = await rect(page, '.neon-stage');
await page.locator('.neon-swatch').nth(2).click();
await multiStroke(page, [wave(r, 0.5)], { steps: 30, delay: 5 });
await page.waitForTimeout(300);
await page.locator('.neon-done').click();
await page.waitForTimeout(900);
await shot(page, `neon/fix/atras/${size}-0-festejo`);
await page.waitForFunction(() => document.body.dataset.screen === 'obras', null, { timeout: 8000 });
await page.waitForTimeout(800);
await shot(page, `neon/fix/atras/${size}-1-galeria`);
const w1 = await works();
check(w1.length === 1 && w1[0].st === 'done' && w1[0].bytes > 1000, 'obra terminada guardada ' + JSON.stringify(w1));
check(w1[0] && w1[0].type === 'image/png', 'capa guardada en PNG: ' + (w1[0] && w1[0].type));
const doneId = w1[0].id;

// "atrás": ahora abre una pizarra en blanco (no la obra terminada)
await page.goBack();
await ready();
await page.waitForTimeout(400);
const trasAtras = await page.evaluate(() => [location.hash, CL.neon.debug.status, CL.neon.debug.hasInk, CL.neon.debug.workId]);
check(trasAtras[0] === '#neon' && !trasAtras[2] && !trasAtras[3], 'atrás tras ¡Terminé! = pizarra en blanco ' + JSON.stringify(trasAtras));
await shot(page, `neon/fix/atras/${size}-2-atras`);

// Abrir la obra terminada desde la galería (neon/<id>), agregar un trazo y enseguida "Borrar todo"
await page.goto(appUrl('neon/' + doneId));
await ready();
await page.waitForTimeout(300);
const abierta = await page.evaluate(() => [CL.neon.debug.status, CL.neon.debug.hasInk]);
check(abierta[0] === 'done' && abierta[1], 'obra terminada abierta para seguir ' + JSON.stringify(abierta));
await page.locator('.neon-swatch').nth(0).click();
await multiStroke(page, [wave(r, 0.25, 0.05)], { steps: 30, delay: 5 });
await page.waitForTimeout(250); // el autoguardado recién arranca: el borrado lo alcanza a mitad de camino
await holdClear();
await page.waitForTimeout(400);
await shot(page, `neon/fix/atras/${size}-3-borrado`);
const tras = await page.evaluate(() => [location.hash, CL.neon.debug.status, CL.neon.debug.hasInk, CL.neon.debug.workId]);
check(tras[0] === '#neon' && tras[1] === 'progress' && !tras[2] && !tras[3], 'tras borrar: obra nueva aparte ' + JSON.stringify(tras));
let w2; for (let k = 0; k < 40; k++) { await page.waitForTimeout(250); w2 = await works(); if (w2.length === 1 && w2[0].bytes > w1[0].bytes) break; }
check(w2.length === 1 && w2[0].id === doneId && w2[0].st === 'done' && w2[0].bytes > w1[0].bytes, 'la terminada sigue intacta y con el trazo agregado ' + JSON.stringify(w2));

// Dibujar algo nuevo: es otra obra (en progreso)
await page.locator('.neon-swatch').nth(5).click();
await multiStroke(page, [wave(r, 0.7, 0.1)], { steps: 30, delay: 5 });
let w3; for (let k = 0; k < 40; k++) { await page.waitForTimeout(250); w3 = await works(); if (w3.length === 2) break; }
check(w3.length === 2 && w3.some((w) => w.id === doneId && w.st === 'done') && w3.some((w) => w.id !== doneId && w.st === 'progress'), 'el dibujo nuevo es otra obra ' + JSON.stringify(w3));
const hashNuevo = await page.evaluate(() => location.hash);
check(hashNuevo === '#neon', 'hash de la obra nueva en progreso: ' + hashNuevo);

// Una obra vacía guardada (como las que dejaba el error) no cuenta como "con tinta"
const vaciaId = await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = c.height = 1;
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const w = await CL.db.works.save({ kind: 'neon', source: 'neon', status: 'done', w: 1, h: 1, paint: blob, thumb: blob, meta: { v: 2, scale: 2, dpr: 2, box: { x: 0, y: 0 }, view: { w: 800, h: 600 } } });
  return w.id;
});
await page.goto(appUrl('neon/' + vaciaId));
await ready();
await page.waitForTimeout(300);
const vacia = await page.evaluate(() => [CL.neon.debug.status, CL.neon.debug.hasInk, !document.querySelector('.neon-hint').classList.contains('hide')]);
check(vacia[0] === 'done' && !vacia[1] && vacia[2], 'obra vacía: sin tinta y con la manito ' + JSON.stringify(vacia));
await page.locator('.neon-done').click();
await page.waitForTimeout(600);
check(await page.evaluate(() => document.body.dataset.screen === 'neon' && !document.querySelector('.celebrate')), '¡Terminé! sobre pizarra vacía no festeja');

await page.goto(appUrl('obras'));
await page.waitForTimeout(1500);
await shot(page, `neon/fix/atras/${size}-4-galeria-final`);
console.log(ok.join('\n'));
console.log('errors', t.errors);
await t.close();
