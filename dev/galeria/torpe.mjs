// QA galería "como un chico de 4 años": toques dobles, pestañas a lo loco, descargar muchas veces,
// borrar con toque corto / largo / dos dedos, atrás con la vista abierta, rotar, entrar y salir muchas veces.
// Uso: cd dev && node galeria/torpe.mjs [tamaño=tablet]
import { launch, appUrl, shot, tap, touchStart, touches } from '../lib.mjs';
import { seed, instrument } from './seed2.mjs';

const size = process.argv[2] || 'tablet';
const clean = (e) => e.filter((x) => !/icons\/.*\.png|ERR_FILE_NOT_FOUND/.test(x));
const log = (...a) => console.log(...a);
const t = await launch({ size });
const { page } = t;
await page.addInitScript(instrument);
await page.goto(appUrl('inicio'));
await page.waitForTimeout(600);
const ids = await seed(page, { done: 14, progress: 4, missingThumb: true });
const center = async (sel) => { const b = await page.locator(sel).first().boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2, b]; };
const state = () => page.evaluate(() => ({
  hash: decodeURIComponent(location.hash), modal: document.querySelectorAll('.modal-back').length,
  tab: document.querySelector('.gal-tab.active')?.getAttribute('aria-label'),
  cards: document.querySelectorAll('.gal-card').length, counts: [...document.querySelectorAll('.gal-count')].map((c) => c.textContent).join('/'),
}));

// A) Entrar desde inicio con doble toque sobre "Mis obras"
{
  const [x, y] = await center('.home-card--obras');
  await tap(page, x, y); await page.waitForTimeout(110); await tap(page, x, y);
  await page.waitForTimeout(1200);
  log('A doble toque Mis obras ->', JSON.stringify(await state()));
  await shot(page, `galeria/torpe-${size}-A-doble-toque-mis-obras`);
  if ((await state()).modal) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
}

// B) Doble toque sobre una tarjeta (la primera, arriba a la izquierda, y una del medio)
for (const nth of [0, 6]) {
  const [x, y] = await center(`.gal-card >> nth=${nth}`);
  await tap(page, x, y); await page.waitForTimeout(120); await tap(page, x, y);
  await page.waitForTimeout(600);
  log(`B doble toque tarjeta ${nth} ->`, JSON.stringify(await state()));
  await shot(page, `galeria/torpe-${size}-B-doble-toque-card${nth}`);
  if ((await state()).modal) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
}
// B2) Triple toque en una tarjeta de la izquierda (¿el 2º toque cae en el fondo del modal y lo cierra?)
{
  const [x, y, b] = await center('.gal-card >> nth=0');
  const px = b.x + 12, py = b.y + b.height - 12;
  await tap(page, px, py); await page.waitForTimeout(150); await tap(page, px, py); await page.waitForTimeout(150); await tap(page, px, py);
  await page.waitForTimeout(600);
  log('B2 triple toque esquina tarjeta 0 ->', JSON.stringify(await state()));
  if ((await state()).modal) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
}

// C) Pestañas a lo loco: 7 toques alternados rápidos
{
  const tabs = [await center('.gal-tab >> nth=0'), await center('.gal-tab >> nth=1')];
  for (let i = 0; i < 7; i++) { const [x, y] = tabs[(i + 1) % 2]; await tap(page, x, y); await page.waitForTimeout(40); }
  await page.waitForTimeout(700);
  log('C pestañas rápidas ->', JSON.stringify(await state()));
  await shot(page, `galeria/torpe-${size}-C-pestanas`);
  const [x, y] = tabs[0]; await tap(page, x, y); await page.waitForTimeout(600);
}

// D) Descargar 5 veces seguidas
{
  const [x, y] = await center('.gal-card >> nth=1');
  await tap(page, x, y); await page.waitForTimeout(900);
  let n = 0; const on = () => n++;
  page.on('download', on);
  const [dx, dy] = await center('.gv-down');
  for (let i = 0; i < 5; i++) { await tap(page, dx, dy); await page.waitForTimeout(150); }
  await page.waitForTimeout(2000);
  page.off('download', on);
  log('D 5 toques en descargar -> descargas:', n);
}

// E) Borrar: toque corto (dedo), dos dedos, arrastrar el dedo fuera del botón a mitad, y mantener
{
  const before = await state();
  const [x, y] = await center('.gv-del');
  await tap(page, x, y); await page.waitForTimeout(300);
  log('E toque corto ->', JSON.stringify(await state()));
  await shot(page, `galeria/torpe-${size}-E-toque-corto`);
  await page.waitForTimeout(1300);
  // dedo que se desliza fuera del botón mientras se mantiene
  await touchStart(page, [{ x, y }]);
  await page.waitForTimeout(500);
  await touches(page, [{ x: x + 150, y: y - 150 }]);
  await page.waitForTimeout(1100);
  await touches(page, []);
  await page.waitForTimeout(700);
  log('E mantener y deslizar fuera ->', JSON.stringify(await state()));
  await page.waitForTimeout(1200);
  // mantener de verdad con el dedo
  const s1 = await state();
  if (s1.modal) {
    await touchStart(page, [{ x, y }]);
    await page.waitForTimeout(700);
    await shot(page, `galeria/torpe-${size}-E-manteniendo`);
    await page.waitForTimeout(800);
    await touches(page, []);
    await page.waitForTimeout(250);
    await shot(page, `galeria/torpe-${size}-E-saliendo`);
    await page.waitForTimeout(800);
  }
  log('E mantener ->', JSON.stringify(before), '→', JSON.stringify(await state()));
  if ((await state()).modal) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
}

// F) Tarjeta sin miniatura (obra vieja/rota): abrir y descargar
{
  const noThumb = ids.find((w) => w.i === 0).id;
  const has = await page.locator(`.gal-card[data-id="${noThumb}"]`).count();
  log('F obra sin miniatura en la grilla:', has);
  if (has) {
    await page.locator(`.gal-card[data-id="${noThumb}"]`).scrollIntoViewIfNeeded();
    const [x, y] = await center(`.gal-card[data-id="${noThumb}"]`);
    await tap(page, x, y); await page.waitForTimeout(1500);
    await shot(page, `galeria/torpe-${size}-F-sin-miniatura`);
    let n = 0; const on = () => n++; page.on('download', on);
    const [dx, dy] = await center('.gv-down'); await tap(page, dx, dy); await page.waitForTimeout(2500);
    page.off('download', on);
    log('F descarga de obra sin miniatura -> descargas:', n, JSON.stringify(await state()));
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  }
}

// G) Botón atrás del navegador (Android) con la vista abierta
{
  await page.evaluate(() => CL.router.go('inicio'));
  await page.waitForTimeout(600);
  await page.evaluate(() => CL.router.go('obras'));
  await page.waitForTimeout(900);
  const [x, y] = await center('.gal-card >> nth=2');
  await tap(page, x, y); await page.waitForTimeout(600);
  await page.goBack();
  await page.waitForTimeout(900);
  log('G atrás con la vista abierta ->', JSON.stringify(await state()));
}

// H) Rotar con la vista abierta y con la grilla
{
  await page.evaluate(() => CL.router.go('obras'));
  await page.waitForTimeout(900);
  const [x, y] = await center('.gal-card >> nth=3');
  await tap(page, x, y); await page.waitForTimeout(900);
  const vp = page.viewportSize();
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await page.waitForTimeout(600);
  await shot(page, `galeria/torpe-${size}-H-rotada-vista`);
  log('H vista tras rotar', JSON.stringify(await page.evaluate(() => { const m = document.querySelector('.gal-view .modal').getBoundingClientRect(); const box = document.querySelector('.gal-view .modal'); return { inside: m.left >= 0 && m.top >= 0 && m.right <= innerWidth + 0.5 && m.bottom <= innerHeight + 0.5, scroll: box.scrollHeight > box.clientHeight + 1, m: [m.x, m.y, m.width, m.height].map(Math.round) }; })));
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await shot(page, `galeria/torpe-${size}-H-rotada-grilla`);
  await page.setViewportSize(vp);
  await page.waitForTimeout(400);
}

// I) Doble toque en "Seguir" y en "Inicio" (¿el segundo toque cae en la pantalla siguiente?)
{
  const [x, y] = await center('.gal-card >> nth=0');
  await tap(page, x, y); await page.waitForTimeout(700);
  const [gx, gy] = await center('.gv-go');
  await tap(page, gx, gy); await page.waitForTimeout(120); await tap(page, gx, gy);
  await page.waitForTimeout(1500);
  log('I doble toque Seguir ->', JSON.stringify(await state()));
  await shot(page, `galeria/torpe-${size}-I-doble-seguir`);
  await page.evaluate(() => CL.router.go('obras'));
  await page.waitForTimeout(900);
  const [hx, hy] = await center('.btn-home');
  await tap(page, hx, hy); await page.waitForTimeout(120); await tap(page, hx, hy);
  await page.waitForTimeout(900);
  log('I doble toque Inicio ->', JSON.stringify(await state()));
}

// J) Entrar y salir 6 veces (con vista abierta a veces): fugas de URLs / listeners
{
  await page.evaluate(() => CL.router.go('inicio'));
  await page.waitForTimeout(500);
  const l0 = await page.evaluate(() => window.__listeners());
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => CL.router.go('obras'));
    await page.waitForTimeout(500);
    if (i % 2) { await page.locator('.gal-card').first().click({ force: true }); await page.waitForTimeout(500); }
    await page.evaluate(() => CL.router.go('inicio'));
    await page.waitForTimeout(600);
  }
  const l1 = await page.evaluate(() => window.__listeners());
  const diff = {}; for (const k of new Set([...Object.keys(l0), ...Object.keys(l1)])) if ((l1[k] || 0) !== (l0[k] || 0)) diff[k] = (l1[k] || 0) - (l0[k] || 0);
  log('J urls vivas:', await page.evaluate(() => window.__liveUrls()), 'listeners document/window que crecieron:', JSON.stringify(diff));
}

// K) Recargar en #obras/<id> y en #obras con la pestaña "sin terminar"
{
  const prog = ids.filter((w) => w.status === 'progress').map((w) => w.id);
  await page.evaluate(() => CL.router.go('obras'));
  await page.waitForTimeout(700);
  await page.locator('.gal-tab').nth(1).click({ force: true });
  await page.waitForTimeout(400);
  await page.reload(); await page.waitForTimeout(1200);
  log('K recarga en sin terminar ->', JSON.stringify(await state()));
  await page.goto(appUrl('obras/' + prog[0])); await page.waitForTimeout(1200);
  log('K obras/<progreso> ->', JSON.stringify(await state()));
  await page.goto(appUrl('obras/no-existe')); await page.waitForTimeout(1200);
  log('K obras/no-existe ->', JSON.stringify(await state()));
}

log('errores', JSON.stringify(clean(t.errors)));
await t.close();
