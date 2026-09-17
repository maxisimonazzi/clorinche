// Pizarra — "atrás" después de ¡Terminé!, "Borrar todo" sobre una obra terminada, salida rápida,
// sonidos al salir y guardado sin pérdida. Uso: node pizarra/fix2/flows.mjs [desktop|tablet|phone]
import { open, board, wave, stroke, ready, click, inked } from '../fix1/h.mjs';
import { shot } from '../../lib.mjs';

const size = process.argv[2] || 'desktop';
const t = await open(size);
const { page } = t;
const pointer = t.size.touch ? 'touch' : 'mouse';
const out = { size, checks: {} };
const ok = (name, cond, extra) => { out.checks[name] = cond ? 'OK' : 'FALLA' + (extra !== undefined ? ' ' + JSON.stringify(extra) : ''); };
const S = (n) => shot(page, 'pizarra/fix2/' + size + '-' + n);

// Contador de loops de sonido abiertos (para ver si alguno queda sonando).
await page.evaluate(() => {
  window.__loops = 0;
  const orig = CL.sound.loop.bind(CL.sound);
  CL.sound.loop = (...a) => {
    const h = orig(...a);
    window.__loops++;
    let open = true;
    const stop = h.stop.bind(h);
    h.stop = (...b) => { if (open) { open = false; window.__loops--; } return stop(...b); };
    return h;
  };
});

/** Tinta de una obra guardada (píxeles con alfa, muestreado) y su tipo. */
const dbWork = (id) => page.evaluate(async (id) => {
  const w = await CL.db.works.get(id);
  if (!w) return null;
  const img = await CL.util.blobToImage(w.paint);
  const c = CL.util.canvas(img.width, img.height); const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let n = 0, h = 0;
  for (let i = 3; i < d.length; i += 16) if (d[i] > 8) { n++; h = (h * 31 + d[i - 3] + d[i - 2] * 7 + d[i - 1] * 13 + i) >>> 0; }
  return { id: w.id, status: w.status, ink: n, hash: h, type: w.paint.type, thumbType: w.thumb && w.thumb.type, updatedAt: w.updatedAt };
}, id);
const list = () => page.evaluate(async () => (await CL.db.works.list({ kind: 'pizarra' })).map((w) => ({ id: w.id, status: w.status })));
const cur = () => page.evaluate(() => { const c = CL.pizarra.current; return c && { work: c.work && { id: c.work.id, status: c.work.status }, has: c._test.hasContent, undo: c._test.undoCount }; });

// 1) Dibujar, ¡Terminé!, galería, "atrás": vuelve la obra terminada (no una pizarra en blanco).
let b = await board(page);
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('fibra'); T.selectColor('#2f5bea'); T.selectSize(3); });
await stroke(page, wave(b, 0.3), { pointer, steps: 16 });
await stroke(page, wave(b, 0.6), { pointer, steps: 16 });
await page.waitForTimeout(900);
await click(t, '.pz-done', 0);
await page.waitForFunction(() => location.hash.startsWith('#obras/'), null, { timeout: 15000 });
const doneId = decodeURIComponent(await page.evaluate(() => location.hash.split('/')[1]));
await page.waitForTimeout(800);
const done0 = await dbWork(doneId);
ok('terminada guardada en PNG', done0 && done0.status === 'done' && done0.type === 'image/png' && done0.ink > 100, done0);
await page.evaluate(() => history.back());
await page.waitForFunction(() => document.body.dataset.screen === 'pizarra', null, { timeout: 10000 });
await ready(page);
const back = { hash: await page.evaluate(() => location.hash), cur: await cur(), ink: await inked(page) };
ok('atrás muestra la obra terminada', back.hash === '#pizarra/' + doneId && back.cur.work && back.cur.work.id === doneId && back.ink > 100, back);
await S('1-atras');

// 2) "Borrar todo" sobre la terminada: queda intacta; lo que sigue es una obra nueva.
await page.evaluate(() => { const T = CL.pizarra.current._test; T.wipeMs = 60; T.wipe(); });
await page.waitForTimeout(1500);
const afterWipe = { cur: await cur(), hash: await page.evaluate(() => location.hash), done: await dbWork(doneId), list: await list() };
ok('borrar todo no toca la terminada', afterWipe.done && afterWipe.done.ink === done0.ink && afterWipe.done.hash === done0.hash && afterWipe.done.status === 'done', afterWipe);
ok('después de borrar todo la pizarra ya no es la terminada', !afterWipe.cur.work && afterWipe.hash === '#pizarra', afterWipe);
b = await board(page);
await page.evaluate(() => CL.pizarra.current._test.selectColor('#ff3b30'));
await stroke(page, wave(b, 0.45, 0.3, 0.7), { pointer, steps: 12 });
await page.waitForTimeout(1800);
const afterDraw = { cur: await cur(), done: await dbWork(doneId), list: await list() };
const newId = afterDraw.cur.work && afterDraw.cur.work.id;
ok('seguir dibujando crea una obra nueva', newId && newId !== doneId && afterDraw.cur.work.status === 'progress', afterDraw);
ok('la terminada sigue intacta', afterDraw.done && afterDraw.done.hash === done0.hash, afterDraw.done);
await S('2-nueva');

// 3) Deshacer el trazo y el borrado: vuelve a ser la terminada; la obra nueva vacía se descarta.
await page.evaluate(() => { const T = CL.pizarra.current._test; T.undo(); });
await page.waitForTimeout(300);
await page.evaluate(() => { const T = CL.pizarra.current._test; T.undo(); });
await page.waitForTimeout(1800);
const afterUndo = { cur: await cur(), hash: await page.evaluate(() => location.hash), list: await list(), ink: await inked(page), done: await dbWork(doneId) };
ok('deshacer el borrado vuelve a la terminada', afterUndo.cur.work && afterUndo.cur.work.id === doneId && afterUndo.hash === '#pizarra/' + doneId && afterUndo.ink > 100, afterUndo);
ok('la obra nueva vacía se borró', !afterUndo.list.some((w) => w.id === newId), afterUndo.list);
ok('terminada igual después de deshacer', afterUndo.done && afterUndo.done.ink === done0.ink, afterUndo.done);

// 4) Abrir la terminada desde la galería, dibujar algo y borrar todo enseguida: lo último que dibujó
//    queda en la terminada (sigue siendo su obra) y la pizarra empieza otra.
await page.evaluate(() => CL.router.go('inicio')); await page.waitForTimeout(300);
await page.evaluate((id) => CL.router.go('pizarra/' + id), doneId); await ready(page);
b = await board(page);
await page.evaluate(() => CL.pizarra.current._test.selectColor('#1fb35a'));
await stroke(page, wave(b, 0.8, 0.2, 0.8, 0.03), { pointer, steps: 12 });
await page.evaluate(() => { const T = CL.pizarra.current._test; T.wipeMs = 60; T.wipe(); }); // antes del autoguardado
await page.waitForTimeout(2000);
const gal = { cur: await cur(), done: await dbWork(doneId), hash: await page.evaluate(() => location.hash) };
ok('desde galería: el trazo previo queda en la terminada', gal.done && gal.done.ink > done0.ink && gal.done.status === 'done', gal);
ok('desde galería: borrar todo desprende la obra', !gal.cur.work && gal.hash === '#pizarra', gal);
const done1 = gal.done;

// 5) Salir no espera la codificación; al volver, está todo.
b = await board(page);
for (let i = 0; i < 4; i++) await stroke(page, wave(b, 0.15 + i * 0.2, 0.05, 0.95, 0.06, 14), { pointer, steps: 10, delay: 0 });
const before = await inked(page);
const leaveMs = await page.evaluate(async () => {
  const t0 = performance.now();
  CL.router.go('inicio');
  while (document.body.dataset.screen !== 'inicio' || !document.querySelector('.screen--inicio')) await new Promise((r) => setTimeout(r, 5));
  return Math.round(performance.now() - t0);
});
await page.evaluate(() => CL.router.go('pizarra')); await ready(page);
const back2 = await inked(page);
ok('salir es rápido (< 250 ms)', leaveMs < 250, leaveMs);
ok('al volver está todo lo dibujado', Math.abs(back2 - before) <= before * 0.01, { before, back2 });
const doneAfter = await dbWork(doneId);
ok('la terminada no cambió', doneAfter.hash === done1.hash, doneAfter);

// 6) Dedo apoyado durante la salida: no quedan sonidos sonando ni trazos fantasma.
b = await board(page);
await page.evaluate(() => CL.pizarra.current._test.selectTool('aerosol'));
await stroke(page, wave(b, 0.5, 0.2, 0.5), { pointer, steps: 10, release: false });
const loopsDuring = await page.evaluate(() => window.__loops);
const late = await page.evaluate(async () => {
  const st = document.querySelector('.pz-stage');
  const r = st.getBoundingClientRect();
  CL.router.go('inicio');
  await Promise.resolve();
  // otro dedo toca la pizarra mientras la pantalla se está yendo
  const o = { pointerId: 77, pointerType: 'touch', isPrimary: false, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true, cancelable: true, button: 0, buttons: 1 };
  st.dispatchEvent(new PointerEvent('pointerdown', o));
  st.dispatchEvent(new PointerEvent('pointermove', Object.assign({}, o, { clientX: o.clientX + 40 })));
  await new Promise((r) => setTimeout(r, 600));
  return { loops: window.__loops, screen: document.body.dataset.screen };
});
if (pointer === 'mouse') await page.mouse.up(); else await page.evaluate(() => 0);
await page.waitForTimeout(400);
ok('sin loops sonando al salir con un dedo apoyado', late.loops === 0 && (await page.evaluate(() => window.__loops)) === 0, { loopsDuring, late });

// 7) Guardado sin pérdida: la capa guardada es idéntica píxel a píxel a la de la pantalla, y
//    recargar y volver a guardar no la degrada.
await page.evaluate(() => CL.router.go('pizarra')); await ready(page);
const pix = () => page.evaluate(async () => {
  const c = CL.pizarra.current._test.layer;
  const a = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const w = CL.pizarra.current.work;
  const got = await CL.db.works.get(w.id);
  const img = await CL.util.blobToImage(got.paint);
  const k = CL.util.canvas(img.width, img.height); const x = k.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, k.width, k.height).data;
  let diff = 0, max = 0;
  if (d.length !== a.length) return { sizeMismatch: [c.width, c.height, img.width, img.height] };
  for (let i = 0; i < d.length; i++) { const e = Math.abs(d[i] - a[i]); if (e) { diff++; if (e > max) max = e; } }
  return { type: got.paint.type, w: img.width, h: img.height, diff, max };
});
const p1 = await pix();
await page.evaluate(() => CL.router.go('inicio')); await page.waitForTimeout(300);
await page.evaluate(() => CL.router.go('pizarra')); await ready(page);
await page.evaluate(() => CL.pizarra.current.save());
const p2 = await pix();
ok('capa guardada en PNG sin pérdida', p1.type === 'image/png' && p1.diff === 0 && p2.diff === 0, { p1, p2 });

out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
