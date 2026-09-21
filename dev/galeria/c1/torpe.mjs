// Revisión (rv): galería "a prueba de un chico de 4 años" con toques reales (CDP), casos nuevos.
// Uso: cd dev && node review-galeria/rv-torpe.mjs [tamaño=tablet]
import { launch, appUrl, shot, tap, touchStart, touches } from '../../lib.mjs';
import { ok, clean, state, dbWorks, instrument, seedSynthetic, center } from './r1-lib.mjs';

const size = process.argv[2] || 'tablet';
const OUT = 'galeria/c1';
const t = await launch({ size });
const { page } = t;
await page.addInitScript(instrument);
const downloads = [];
page.on('download', (d) => downloads.push(d.suggestedFilename()));
await page.goto(appUrl('inicio'));
await page.waitForTimeout(700);
await seedSynthetic(page, { done: 12, progress: 3 });
await page.evaluate(() => CL.router.go('obras'));
await page.waitForTimeout(1300);

const openCard = async (nth) => {
  const [x, y] = await center(page, `.gal-card >> nth=${nth}`);
  await tap(page, x, y);
  await page.waitForTimeout(700);
};
const closeIfOpen = async () => { if ((await state(page)).modal) { await page.keyboard.press('Escape'); await page.waitForTimeout(600); } };
const viewId = () => page.evaluate(() => {
  const img = document.querySelector('.gal-view .gv-img');
  return img ? img.getAttribute('src') : null;
});

// A) Cerrar con la X y enseguida tocar otra obra (carrera con history.back()).
for (const gap of [20, 210, 260]) {
  await openCard(0);
  const [cx, cy] = await center(page, '.gv-close');
  await tap(page, cx, cy);
  await page.waitForTimeout(gap);
  const [x1, y1] = await center(page, '.gal-card >> nth=1');
  await tap(page, x1, y1);
  await page.waitForTimeout(900);
  const s1 = await state(page);
  // La obra abierta es la que la galería anota en el historial (galLast); la imagen de la vista cambia a la versión nítida.
  const id1 = await page.evaluate(() => document.querySelectorAll('.gal-card')[1].dataset.id);
  const same = !!(s1.hstate && s1.hstate.galLast === id1);
  ok(s1.modal === 1 && same && s1.hash === '#obras', `A${gap}) X y otra obra a los ${gap} ms → vista de la 2ª abierta (${JSON.stringify({ modal: s1.modal, same, hash: s1.hash, hstate: s1.hstate })})`);
  if (!s1.modal) { console.log('   (toque perdido: el fondo que se desvanece lo tapa)'); continue; }
  await page.evaluate(() => history.back());
  await page.waitForTimeout(700);
  const s2 = await state(page);
  ok(s2.modal === 0 && s2.hash === '#obras', `A${gap}) atrás cierra la vista y queda en la galería (${JSON.stringify({ modal: s2.modal, hash: s2.hash, hstate: s2.hstate })})`);
  await closeIfOpen();
}
{
  // Tras todo eso, un solo "atrás" vuelve al inicio (no hay entradas muertas).
  await page.evaluate(() => history.back());
  await page.waitForTimeout(1200);
  const s = await state(page);
  ok(s.hash === '#inicio', 'A) después, un "atrás" → inicio (' + s.hash + ')');
  await page.evaluate(() => CL.router.go('obras'));
  await page.waitForTimeout(1300);
}

// B) Mantener apretado el tacho con un pulgar apoyado en el fondo (agarrando la tablet).
// Corrección 1: el fondo ya no cierra con un dedo apoyado (era el pulgar que sostiene la tablet), así que el
// tacho sigue su cuenta y borra: el chico lo mantuvo apretado a propósito. Al soltar no se abre nada.
{
  const n0 = (await dbWorks(page)).length;
  await openCard(2);
  const [dx, dy] = await center(page, '.gv-del');
  const vp = page.viewportSize();
  await touchStart(page, [{ x: dx, y: dy, id: 1 }]);
  await page.waitForTimeout(500);
  // segundo dedo en una esquina del fondo
  await touchStart(page, [{ x: dx, y: dy, id: 1 }, { x: 6, y: vp.height - 6, id: 2 }]);
  await page.waitForTimeout(1300);
  await touches(page, []);
  await page.waitForTimeout(1200);
  const n1 = (await dbWorks(page)).length;
  const s = await state(page);
  ok(n1 === n0 - 1 && s.modal === 0, `B) tacho + pulgar apoyado en el fondo → la vista no se cierra por el pulgar; el tacho borra (${n0}→${n1}), vista cerrada (${s.modal})`);
  // al soltar no se abrió otra obra
  ok(s.modal === 0 && s.hash === '#obras', 'B) al soltar no se abre nada');
}

// C) Borrar manteniendo apretado con el dedo; otro dedo apoyado en una obra: al soltar no abre nada.
{
  const n0 = (await dbWorks(page)).length;
  await openCard(0);
  const [dx, dy] = await center(page, '.gv-del');
  await touchStart(page, [{ x: dx, y: dy, id: 1 }]);
  await page.waitForTimeout(1600);
  await page.waitForTimeout(800); // vista cerrada, tarjeta yéndose, dedo todavía apoyado
  await touches(page, []);
  await page.waitForTimeout(900);
  const n1 = (await dbWorks(page)).length;
  const s = await state(page);
  ok(n1 === n0 - 1 && s.modal === 0, `C) borrar manteniendo → ${n0}→${n1}, al soltar sin vista (${s.modal})`);
}

// D) Descargar: 3 toques rápidos → 1 archivo; 1,7 s después otro toque → 2º archivo.
{
  downloads.length = 0;
  await openCard(1);
  const [x, y] = await center(page, '.gv-down');
  for (let i = 0; i < 3; i++) { await tap(page, x, y); await page.waitForTimeout(90); }
  await page.waitForTimeout(1700);
  const n1 = downloads.length;
  await tap(page, x, y);
  await page.waitForTimeout(1500);
  ok(n1 === 1 && downloads.length === 2, `D) 3 toques → ${n1} descarga(s); otro toque más tarde → ${downloads.length} (${downloads.join(', ')})`);
  await closeIfOpen();
}

// E) Deslizar el dedo sobre la grilla (scroll) empezando en una obra: scrollea y no abre nada.
{
  const [x, y] = await center(page, '.gal-card >> nth=4');
  const top0 = await page.evaluate(() => document.querySelector('.gal-grid').scrollTop);
  const c = await page.context().newCDPSession(page);
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  for (let k = 1; k <= 12; k++) {
    await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - k * 20, id: 1 }] });
    await page.waitForTimeout(16);
  }
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(900);
  const top1 = await page.evaluate(() => document.querySelector('.gal-grid').scrollTop);
  const s = await state(page);
  ok(top1 > top0 + 50 && s.modal === 0, `E) deslizar sobre una obra scrollea (${top0}→${top1}) y no abre (${s.modal})`);
  await page.evaluate(() => { document.querySelector('.gal-grid').scrollTop = 0; });
}

// F) Rotar con la vista abierta.
{
  const vp = page.viewportSize();
  await openCard(3);
  await shot(page, `${OUT}/torpe-${size}-antes-rotar`);
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await page.waitForTimeout(800);
  await shot(page, `${OUT}/torpe-${size}-rotada-vista`);
  const m = await page.evaluate(() => {
    const r = document.querySelector('.gal-view .modal').getBoundingClientRect();
    const btns = [...document.querySelectorAll('.gv-actions .btn')].map((b) => b.getBoundingClientRect());
    return { inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, btnsIn: btns.every((b) => b.bottom <= r.bottom && b.right <= r.right) };
  });
  ok(m.inside && m.btnsIn, 'F) vista rotada entra ' + JSON.stringify(m));
  await closeIfOpen();
  await shot(page, `${OUT}/torpe-${size}-rotada-grilla`);
  await page.setViewportSize(vp);
  await page.waitForTimeout(600);
}

// G) Atrás con la vista abierta; recargar con la vista abierta; atrás → inicio.
{
  await openCard(0);
  await page.evaluate(() => history.back());
  await page.waitForTimeout(700);
  const s1 = await state(page);
  ok(s1.modal === 0 && s1.hash === '#obras', `G) atrás cierra la vista (${JSON.stringify({ m: s1.modal, h: s1.hash })})`);
  await openCard(0);
  await page.reload();
  await page.waitForTimeout(1800);
  const s2 = await state(page);
  ok(s2.modal === 0 && s2.hash === '#obras' && !(s2.hstate && s2.hstate.galView), `G) recargar con la vista → galería sin vista (${JSON.stringify({ m: s2.modal, h: s2.hash, st: s2.hstate })})`);
  await page.evaluate(() => history.back());
  await page.waitForTimeout(1300);
  const s3 = await state(page);
  ok(s3.hash === '#inicio', 'G) y un atrás → inicio (' + s3.hash + ')');
}

// H) Pestañas: tocar "sin terminar" y enseguida una obra (antes de que termine de dibujar la grilla).
{
  await page.evaluate(() => CL.router.go('obras'));
  await page.waitForTimeout(1300);
  const [bx, by] = await center(page, '.gal-tab >> nth=1');
  const [x0, y0] = await center(page, '.gal-card >> nth=0');
  await tap(page, bx, by);
  await page.waitForTimeout(40);
  await tap(page, x0, y0);
  await page.waitForTimeout(800);
  const s = await state(page);
  const kindOpen = await page.evaluate(() => document.querySelector('.gal-view') ? 'abierta' : 'no');
  console.log('H) pestaña + obra enseguida →', JSON.stringify({ tab: s.tab, modal: s.modal, kindOpen }));
  await closeIfOpen();
}

const errs = clean(t.errors);
ok(errs.length === 0, 'sin errores ' + JSON.stringify(errs).slice(0, 400));
await t.close();
