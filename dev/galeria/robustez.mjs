// Galería e inicio "a prueba de chicos": dobles toques, soltar el dedo después de borrar, botón atrás
// con la vista abierta, descargar muchas veces, obra sin miniatura, recarga con la vista abierta.
// Todo con toques reales (CDP) en tablet. Uso: cd dev && node galeria/robustez.mjs [tamaño=tablet]
import { launch, appUrl, shot, tap, touchStart, touches } from '../lib.mjs';
import { seed } from './seed2.mjs';

const size = process.argv[2] || 'tablet';
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'FALLA') + ' ' + msg); if (!cond) process.exitCode = 1; };
const t = await launch({ size });
const { page } = t;
await page.goto(appUrl('inicio'));
await page.waitForTimeout(600);
const ids = await seed(page, { done: 14, progress: 4, missingThumb: true });
const center = async (sel) => { const b = await page.locator(sel).first().boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2, b]; };
const state = () => page.evaluate(() => ({
  hash: decodeURIComponent(location.hash), modal: document.querySelectorAll('.modal-back').length,
  tab: document.querySelector('.gal-tab.active')?.getAttribute('aria-label'),
  cards: document.querySelectorAll('.gal-card').length,
}));
const closeModal = async () => { if ((await state()).modal) { await page.keyboard.press('Escape'); await page.waitForTimeout(450); } };

// 1) Doble toque en "Mis obras": entra a la galería y NO abre una obra.
{
  const [x, y] = await center('.home-card--obras');
  await tap(page, x, y); await page.waitForTimeout(110); await tap(page, x, y);
  await page.waitForTimeout(1100);
  const s = await state();
  ok(s.hash === '#obras' && s.modal === 0, 'doble toque en Mis obras: galería sin vista abierta ' + JSON.stringify(s));
}

// 2) Doble / triple toque en una tarjeta: la vista queda abierta (el 2º toque no la cierra ni aprieta botones).
for (const nth of [0, 5]) {
  const [x, y, b] = await center(`.gal-card >> nth=${nth}`);
  const px = b.x + 14, py = b.y + b.height - 14; // esquina: suele caer sobre el fondo del modal
  await tap(page, px, py); await page.waitForTimeout(140); await tap(page, px, py); await page.waitForTimeout(140); await tap(page, x, y);
  await page.waitForTimeout(600);
  const s = await state();
  ok(s.modal === 1 && s.hash === '#obras', `triple toque en la tarjeta ${nth}: vista abierta y en la galería ` + JSON.stringify(s));
  await closeModal();
}

// 3) Un toque en el fondo, pasado el primer instante, sí cierra la vista.
{
  const [x, y] = await center('.gal-card >> nth=1');
  await tap(page, x, y); await page.waitForTimeout(700);
  await tap(page, 6, 6); await page.waitForTimeout(500);
  ok((await state()).modal === 0, 'tocar el fondo cierra la vista');
}

// 4) Cinco toques en descargar → una sola descarga.
{
  const [x, y] = await center('.gal-card >> nth=1');
  await tap(page, x, y); await page.waitForTimeout(900);
  let n = 0; const on = () => n++;
  page.on('download', on);
  const [dx, dy] = await center('.gv-down');
  for (let i = 0; i < 5; i++) { await tap(page, dx, dy); await page.waitForTimeout(150); }
  await page.waitForTimeout(1800);
  ok(n === 1, `5 toques seguidos en descargar = ${n} descarga(s)`);
  // pasado el respiro, se puede volver a descargar
  await tap(page, dx, dy); await page.waitForTimeout(1500);
  page.off('download', on);
  ok(n === 2, 'después de un ratito se puede volver a descargar (' + n + ')');
  await closeModal();
}

// 5) Borrar manteniendo con el dedo y soltar: no se abre la obra que quedó debajo.
for (let r = 0; r < 2; r++) {
  const before = (await state()).cards;
  const [x, y] = await center(`.gal-card >> nth=${r * 3 + 1}`);
  await tap(page, x, y); await page.waitForTimeout(700);
  const [bx, by] = await center('.gv-del');
  const under = await page.evaluate(([x, y]) => !!document.elementsFromPoint(x, y).find((e) => e.classList && e.classList.contains('gal-card')), [bx, by]);
  // toque corto: no borra
  await tap(page, bx, by); await page.waitForTimeout(300);
  ok((await state()).cards === before && (await state()).modal === 1, 'toque corto en borrar no borra');
  await page.waitForTimeout(1300);
  await touchStart(page, [{ x: bx, y: by }]);
  await page.waitForTimeout(700);
  if (r === 0) await shot(page, `galeria/robustez-${size}-borrando`);
  await page.waitForTimeout(900);
  await touches(page, []);
  await page.waitForTimeout(900);
  const s = await state();
  ok(s.cards === before - 1 && s.modal === 0 && s.hash === '#obras', `mantener y soltar borra sin abrir otra (había tarjeta debajo: ${under}) ` + JSON.stringify(s));
}

// 6) Botón atrás con la vista abierta: cierra la vista y se queda en la galería; otro atrás vuelve al inicio.
{
  const [x, y] = await center('.gal-card >> nth=2');
  await tap(page, x, y); await page.waitForTimeout(600);
  await page.goBack(); await page.waitForTimeout(700);
  const s = await state();
  ok(s.modal === 0 && s.hash === '#obras' && s.cards > 0, 'atrás con la vista abierta sólo la cierra ' + JSON.stringify(s));
  await page.goBack(); await page.waitForTimeout(900);
  ok((await state()).hash === '#inicio', 'otro atrás vuelve al inicio');
  await page.goForward(); await page.waitForTimeout(900);
}

// 7) Cerrar con la X no deja entradas colgadas: atrás vuelve directo al inicio.
{
  const [x, y] = await center('.gal-card >> nth=2');
  await tap(page, x, y); await page.waitForTimeout(600);
  const [cx, cy] = await center('.gv-close');
  await tap(page, cx, cy); await page.waitForTimeout(500);
  await page.goBack(); await page.waitForTimeout(900);
  ok((await state()).hash === '#inicio', 'cerrar con la X y después atrás → inicio');
  await page.evaluate(() => CL.router.go('obras')); await page.waitForTimeout(900);
}

// 8) Seguir desde la vista y volver con atrás → galería (sin vista abierta).
{
  const w = ids.find((x) => x.kind === 'pizarra' && x.status === 'done');
  await page.locator(`.gal-card[data-id="${w.id}"]`).scrollIntoViewIfNeeded();
  const [x, y] = await center(`.gal-card[data-id="${w.id}"]`);
  await tap(page, x, y); await page.waitForTimeout(600);
  const [gx, gy] = await center('.gv-go');
  await tap(page, gx, gy); await page.waitForTimeout(1300);
  ok((await state()).hash === '#pizarra/' + w.id, 'seguir abre la pizarra con esa obra');
  await page.goBack(); await page.waitForTimeout(1300);
  const s = await state();
  ok(s.hash === '#obras' && s.modal === 0, 'atrás desde la pizarra vuelve a la galería ' + JSON.stringify(s));
}

// 9) Obra sin miniatura: se arma sola desde la imagen final.
{
  const noThumb = ids.find((w) => w.i === 0).id;
  await page.locator(`.gal-card[data-id="${noThumb}"]`).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const r = await page.evaluate((id) => {
    const c = document.querySelector(`.gal-card[data-id="${id}"]`);
    const i = c && c.querySelector('.gal-thumb');
    return { img: !!(i && i.complete && i.naturalWidth > 0), missing: !!(c && c.querySelector('.gal-missing')) };
  }, noThumb);
  ok(r.img && !r.missing, 'la obra sin miniatura muestra su imagen ' + JSON.stringify(r));
  await shot(page, `galeria/robustez-${size}-sin-miniatura`);
}

// 10) Recargar con la vista abierta y volver a abrir/cerrar: sin estados raros.
{
  await page.locator('.gal-card').first().scrollIntoViewIfNeeded();
  const [x, y] = await center('.gal-card >> nth=0');
  await tap(page, x, y); await page.waitForTimeout(500);
  await page.reload(); await page.waitForTimeout(1300);
  let s = await state();
  ok(s.hash === '#obras' && s.modal === 0, 'recargar con la vista abierta → galería ' + JSON.stringify(s));
  const [x2, y2] = await center('.gal-card >> nth=0');
  await tap(page, x2, y2); await page.waitForTimeout(600);
  await page.goBack(); await page.waitForTimeout(700);
  s = await state();
  ok(s.hash === '#obras' && s.modal === 0, 'tras recargar, atrás cierra la vista ' + JSON.stringify(s));
}

// 11) Doble toque en la casita: vuelve al inicio y el 2º toque no abre una sección.
{
  const [hx, hy] = await center('.btn-home');
  await tap(page, hx, hy); await page.waitForTimeout(100); await tap(page, hx, hy);
  await page.waitForTimeout(900);
  ok((await state()).hash === '#inicio', 'doble toque en la casita → inicio');
}

const errs = t.errors.filter((x) => !/icons\/.*\.png|ERR_FILE_NOT_FOUND/.test(x));
ok(errs.length === 0, 'sin errores de consola ' + JSON.stringify(errs));
await t.close();
