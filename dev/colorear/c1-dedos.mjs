// Corrección 1 — dedos torpes con tiempos exactos (eventos de puntero sintéticos dentro de la página):
// mano apoyada, toques superpuestos, roce durante un trazo, pellizco de verdad, lápiz con palma,
// y el trazo cancelado que no debe quedar guardado.
// (Con CDP en headless, un "esperar 40 ms" entre dedos tarda 200+ ms: no sirve para medir superposiciones.)
import { launch, appUrl, shot } from '../lib.mjs';
import { ready, filterErrors } from '../review-colorear/common.mjs';
const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
await page.goto(appUrl('colorear/gato'));
await ready(page);
await page.waitForTimeout(300);

// Helpers dentro de la página: T.down(id, fx, fy, tipo), T.move, T.up, T.cancel (fracciones del dibujo).
await page.evaluate(() => {
  const board = () => document.querySelector('.cl-board');   // se busca cada vez (cambia al abrir otro dibujo)
  const pt = (fx, fy) => { const r = board().getBoundingClientRect(); return [r.left + r.width * fx, r.top + r.height * fy]; };
  const fire = (type, id, fx, fy, pointerType = 'touch') => {
    id += 100;
    const [x, y] = pt(fx, fy);
    board().dispatchEvent(new PointerEvent(type, {
      pointerId: id, pointerType, clientX: x, clientY: y, bubbles: true, cancelable: true,
      button: type === 'pointermove' ? -1 : 0, buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
      isPrimary: id === 1, pressure: 0.5,
    }));
  };
  window.T = {
    down: (id, fx, fy, ty) => fire('pointerdown', id, fx, fy, ty),
    move: (id, fx, fy, ty) => fire('pointermove', id, fx, fy, ty),
    up: (id, fx, fy, ty) => fire('pointerup', id, fx, fy, ty),
    cancel: (id, fx, fy, ty) => fire('pointercancel', id, fx, fy, ty),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    hist: () => CL.coloring.screen.painter.historyLength,
    k: () => +CL.coloring.screen.view.k.toFixed(3),
    px: (fx, fy) => {
      const c = CL.coloring.screen.painter.canvas;
      return Array.from(c.getContext('2d').getImageData(Math.round(c.width * fx), Math.round(c.height * fy), 1, 1).data);
    },
  };
});
const run = (label, fn) => page.evaluate(fn).then((r) => { console.log(`[${size}] ${label}`, JSON.stringify(r)); return r; });
const ok = [];

// a) Mano apoyada abajo a la derecha (quieta) y toques con otro dedo: pinta cada toque, la palma no.
ok.push(await run('a) mano apoyada + 2 toques', async () => {
  const h0 = T.hist();
  T.down(1, 0.92, 0.95); await T.sleep(400);
  T.down(2, 0.5, 0.35); await T.sleep(90); T.up(2, 0.5, 0.35); await T.sleep(400);
  const h1 = T.hist() - h0;
  T.down(3, 0.05, 0.05); await T.sleep(90); T.up(3, 0.05, 0.05); await T.sleep(400);
  const h2 = T.hist() - h0;
  T.up(1, 0.92, 0.95); await T.sleep(400);
  const h3 = T.hist() - h0;
  return { trasToque1: h1, trasToque2: h2, trasLevantarMano: h3, zoom: T.k(), cara: T.px(0.5, 0.35)[3], pass: h1 === 1 && h2 === 2 && h3 === 2 && T.k() === 1 };
}));
// b) Dos toques casi simultáneos (40 ms de diferencia, 30 ms de superposición): pintan los dos.
ok.push(await run('b) toques superpuestos', async () => {
  CL.coloring.screen.st.color = '#27ae4f';
  const h0 = T.hist();
  T.down(4, 0.5, 0.6); await T.sleep(40); T.down(5, 0.3, 0.85); await T.sleep(30); T.up(5, 0.3, 0.85); await T.sleep(40); T.up(4, 0.5, 0.6);
  await T.sleep(500);
  return { nuevos: T.hist() - h0, zoom: T.k(), pass: T.hist() - h0 === 2 && T.k() === 1 };
}));
// c) Pellizco de verdad: dos dedos que se separan -> zoom, sin pintar.
ok.push(await run('c) pellizco', async () => {
  const h0 = T.hist();
  T.down(6, 0.45, 0.5); await T.sleep(30); T.down(7, 0.55, 0.5);
  for (let i = 1; i <= 15; i++) { await T.sleep(16); T.move(6, 0.45 - i * 0.012, 0.5); T.move(7, 0.55 + i * 0.012, 0.5); }
  T.up(6, 0.27, 0.5); T.up(7, 0.73, 0.5); await T.sleep(400);
  const r = { nuevos: T.hist() - h0, zoom: T.k() };
  document.querySelector('[aria-label="Ver todo el dibujo"]').click(); await T.sleep(400);
  return Object.assign(r, { pass: r.nuevos === 0 && r.zoom > 1.5 });
}));
// d) Pincel: trazo largo y un dedo extra roza 50 ms al final -> el trazo queda.
ok.push(await run('d) trazo largo + roce', async () => {
  document.querySelector('[aria-label="Pincel"]').click(); await T.sleep(100);
  CL.coloring.screen.st.color = '#2d68e0';
  const h0 = T.hist();
  T.down(8, 0.1, 0.97); for (let i = 1; i <= 20; i++) { await T.sleep(12); T.move(8, 0.1 + i * 0.04, 0.97); }
  T.down(9, 0.5, 0.35); await T.sleep(50); T.up(9, 0.5, 0.35); await T.sleep(20); T.up(8, 0.9, 0.97);
  await T.sleep(300);
  return { nuevos: T.hist() - h0, zoom: T.k(), pintado: T.px(0.5, 0.97)[3], pass: T.hist() - h0 === 1 && T.px(0.5, 0.97)[3] > 0 };
}));
// e) Pincel: dos dedos que bajan casi juntos y se separan -> pellizco, el trazo joven se cancela.
ok.push(await run('e) trazo joven + segundo dedo = pellizco', async () => {
  const h0 = T.hist(); const before = T.px(0.42, 0.55)[3];
  T.down(10, 0.42, 0.55); await T.sleep(20); T.move(10, 0.41, 0.55); await T.sleep(40); T.down(11, 0.58, 0.55);
  for (let i = 1; i <= 12; i++) { await T.sleep(16); T.move(10, 0.41 - i * 0.012, 0.55); T.move(11, 0.58 + i * 0.012, 0.55); }
  T.up(10, 0.27, 0.55); T.up(11, 0.72, 0.55); await T.sleep(400);
  const r = { nuevos: T.hist() - h0, zoom: T.k(), restoDeTrazo: T.px(0.42, 0.55)[3] - before };
  document.querySelector('[aria-label="Ver todo el dibujo"]').click(); await T.sleep(400);
  return Object.assign(r, { pass: r.nuevos === 0 && r.zoom > 1.3 && r.restoDeTrazo === 0 });
}));
// f) Pincel con la mano apoyada: la palma no deja punto y el dedo dibuja (en zonas todavía sin pintar).
ok.push(await run('f) pincel con mano apoyada', async () => {
  document.querySelector('.cl-sw[data-color="#ff3f97"]').click(); await T.sleep(50);
  document.querySelector('[aria-label="Pincel"]').click(); await T.sleep(50);
  const h0 = T.hist(); const palma0 = T.px(0.97, 0.5), trazo0 = T.px(0.25, 0.62);
  T.down(12, 0.97, 0.5); await T.sleep(400);
  T.down(13, 0.15, 0.62); for (let i = 1; i <= 10; i++) { await T.sleep(12); T.move(13, 0.15 + i * 0.02, 0.62); } T.up(13, 0.35, 0.62);
  await T.sleep(200); T.up(12, 0.97, 0.5); await T.sleep(300);
  const palma = T.px(0.97, 0.5), trazo = T.px(0.25, 0.62);
  return { nuevos: T.hist() - h0, palma0, palma, trazo0, trazo,
    pass: T.hist() - h0 === 1 && palma.join() === palma0.join() && trazo.join() !== trazo0.join() };
}));
// g) Lápiz dibujando y la palma apoya enseguida (trazo joven): el trazo sigue, sin pellizco.
ok.push(await run('g) lápiz + palma', async () => {
  const h0 = T.hist();
  T.down(14, 0.1, 0.45, 'pen'); await T.sleep(40); T.down(15, 0.9, 0.9, 'touch');
  for (let i = 1; i <= 10; i++) { await T.sleep(12); T.move(14, 0.1 + i * 0.03, 0.45, 'pen'); T.move(15, 0.9, 0.9 - i * 0.01, 'touch'); }
  T.up(14, 0.4, 0.45, 'pen'); T.up(15, 0.9, 0.8); await T.sleep(300);
  return { nuevos: T.hist() - h0, zoom: T.k(), pass: T.hist() - h0 === 1 && T.k() === 1 };
}));
await shot(page, `colorear/c1-dedos-${size}`);
// h) El autoguardado cae en medio de un trazo que después se cancela (pointercancel): no queda guardado.
//    En un dibujo nuevo (pez), pincel negro sin "no salirse".
await page.evaluate(() => CL.router.go('colorear/pez'));
await ready(page);
await page.waitForTimeout(300);
ok.push(await run('h) trazo cancelado no se guarda', async () => {
  document.querySelector('[aria-label="Pincel"]').click();
  document.querySelector('.cl-clip').click();
  document.querySelector('.cl-sw[data-color="#262626"]').click();
  T.down(16, 0.1, 0.05); for (let i = 1; i <= 10; i++) { await T.sleep(10); T.move(16, 0.1 + i * 0.08, 0.05); } T.up(16, 0.9, 0.05);
  await T.sleep(100);
  T.down(17, 0.05, 0.95); const t0 = performance.now(); let i = 0;
  while (performance.now() - t0 < 1500) { i++; T.move(17, 0.05 + Math.min(0.9, i * 0.01), 0.95 + (i % 2) * 0.002); await T.sleep(15); }
  const durante = T.px(0.3, 0.95)[3];
  T.cancel(17, 0.9, 0.95); await T.sleep(1600);
  const w = CL.coloring.screen.work;
  const saved = w && await CL.db.works.get(w.id);
  const img = saved && await CL.util.blobToImage(saved.paint);
  const c = CL.util.canvas(img.width, img.height); const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
  const at = (fx, fy) => cx.getImageData(Math.round(c.width * fx), Math.round(c.height * fy), 1, 1).data[3];
  const r = { duranteEnPantalla: durante, trasCancelarEnPantalla: T.px(0.3, 0.95)[3], guardadoTrazoCancelado: at(0.3, 0.95), guardadoTrazo1: at(0.5, 0.05) };
  return Object.assign(r, { pass: durante > 0 && r.trasCancelarEnPantalla === 0 && r.guardadoTrazoCancelado === 0 && r.guardadoTrazo1 > 0 });
}));
// Salir y volver a entrar: el trazo cancelado no reaparece.
await page.evaluate(() => CL.router.go('inicio'));
await page.waitForTimeout(1200);
await page.evaluate(() => CL.router.go('colorear/pez'));
await ready(page);
ok.push(await run('h2) tras volver a entrar', async () => {
  const r = { trazoCancelado: T.px(0.3, 0.95)[3], trazo1: T.px(0.5, 0.05)[3] };
  return Object.assign(r, { pass: r.trazoCancelado === 0 && r.trazo1 > 0 });
}));
console.log(`[${size}] TODO OK:`, ok.every((r) => r.pass), 'errores', JSON.stringify(filterErrors(t.errors)));
await t.close();
