// Revisión (rv): inicio con toques torpes (doble/triple toque, dos dedos, casita doble) y fugas de listeners.
// Uso: cd dev && node review-galeria/rv-home.mjs [tamaño=phone]
import { launch, appUrl, shot, tap, touchStart, touches } from '../../lib.mjs';
import { ok, clean, instrument, center } from './r1-lib.mjs';

const size = process.argv[2] || 'phone';
const t = await launch({ size });
const { page } = t;
await page.addInitScript(instrument);
const fileChoosers = [];
page.on('filechooser', (f) => fileChoosers.push(f));
const hash = () => page.evaluate(() => decodeURIComponent(location.hash));
const home = async () => { await page.goto(appUrl('inicio')); await page.waitForTimeout(900); };

await home();
const l0 = await page.evaluate(() => window.__listeners());
for (const [cls, to] of [['.home-card--colorear', '#dibujos'], ['.home-card--pizarra', '#pizarra'], ['.home-card--subir', '#subir'], ['.home-card--obras', '#obras']]) {
  for (const n of [2, 3]) {
    await home();
    fileChoosers.length = 0;
    const [x, y] = await center(page, cls);
    for (let i = 0; i < n; i++) { await tap(page, x, y); await page.waitForTimeout(110); }
    await page.waitForTimeout(1600);
    const h = await hash();
    const modal = await page.evaluate(() => document.querySelectorAll('.modal-back').length);
    ok(h === to && fileChoosers.length === 0 && modal === 0, `${n} toques en ${cls} → ${h} (selector de archivos: ${fileChoosers.length}, modales: ${modal})`);
  }
}
// Accesos chiquitos: doble toque en neón
{
  await home();
  const [x, y] = await center(page, '.home-mini >> nth=0');
  await tap(page, x, y); await page.waitForTimeout(100); await tap(page, x, y);
  await page.waitForTimeout(1600);
  ok((await hash()) === '#neon', 'doble toque en acceso neón → ' + (await hash()));
}
// Dos dedos a la vez en dos tarjetas
{
  await home();
  const h0 = await page.evaluate(() => history.length);
  const [x1, y1] = await center(page, '.home-card--colorear');
  const [x2, y2] = await center(page, '.home-card--obras');
  await touchStart(page, [{ x: x1, y: y1, id: 1 }, { x: x2, y: y2, id: 2 }]);
  await page.waitForTimeout(60);
  await touches(page, []);
  await page.waitForTimeout(1500);
  const h1 = await page.evaluate(() => history.length);
  console.log('   dos dedos →', await hash(), 'history', h0, '→', h1);
  ok(h1 - h0 <= 1, 'dos dedos en dos tarjetas → una sola navegación (' + (await hash()) + ')');
}
// Casita doble desde la galería: vuelve al inicio y no abre otra sección
{
  await page.goto(appUrl('obras'));
  await page.waitForTimeout(1300);
  const [x, y] = await center(page, '.btn-home');
  await tap(page, x, y); await page.waitForTimeout(120); await tap(page, x, y);
  await page.waitForTimeout(1500);
  ok((await hash()) === '#inicio', 'doble toque en la casita (galería) → ' + (await hash()));
}
// Botón de sonido: toque, doble toque
{
  await home();
  const [x, y] = await center(page, '.home-sound .btn');
  const m0 = await page.evaluate(() => CL.sound.isMuted());
  await tap(page, x, y); await page.waitForTimeout(300);
  const m1 = await page.evaluate(() => CL.sound.isMuted());
  await tap(page, x, y); await page.waitForTimeout(300);
  const m2 = await page.evaluate(() => CL.sound.isMuted());
  ok(m0 !== m1 && m1 !== m2, `silencio alterna (${m0}→${m1}→${m2})`);
}
// Fugas: listeners en window/document después de todo (vuelvo al inicio y espero)
{
  await page.evaluate(() => CL.router.go('inicio'));
  await page.waitForTimeout(2000);
  const l1 = await page.evaluate(() => window.__listeners());
  console.log('   listeners (instrumentados desde la última carga):', JSON.stringify(l1));
}
// Movimiento reducido: las letras y tarjetas quietas
{
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await home();
  const anim = await page.evaluate(() => ({
    letter: getComputedStyle(document.querySelector('.home-letter')).animationName,
    deco: getComputedStyle(document.querySelector('.deco')).animationName,
    minis: getComputedStyle(document.querySelector('.home-minis')).animationDuration,
  }));
  ok(anim.letter === 'none' && anim.deco === 'none', 'reduced-motion: ' + JSON.stringify(anim));
}
ok(clean(t.errors).length === 0, 'sin errores ' + JSON.stringify(clean(t.errors)).slice(0, 400));
await t.close();
