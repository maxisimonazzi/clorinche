// Revisión 1: doble / triple toque en cada tarjeta del inicio y en los accesos. ¿El 2º toque hace algo en la pantalla nueva?
import { launch, appUrl, shot, tap } from '../../lib.mjs';
import { ok, clean, center } from './lib.mjs';
const size = process.argv[2] || 'tablet';
const GAP = +(process.argv[3] || 150);
const TAPS = +(process.argv[4] || 2);
const t = await launch({ size });
const { page } = t;
let chooser = 0;
page.on('filechooser', () => chooser++);
for (const [sel, name, expect] of [
  ['.home-card--colorear', 'colorear', '#dibujos'], ['.home-card--pizarra', 'pizarra', '#pizarra'],
  ['.home-card--subir', 'subir', '#subir'], ['.home-card--obras', 'obras', '#obras'],
  ['.home-mini >> nth=0', 'neon', '#neon'], ['.home-mini >> nth=1', 'fuegos', '#fuegos'],
]) {
  await page.goto('about:blank');
  await page.goto(appUrl('inicio'));
  await page.waitForTimeout(900);
  const c0 = chooser;
  const [x, y] = await center(page, sel);
  await tap(page, x, y); for (let k = 1; k < TAPS; k++) { await page.waitForTimeout(GAP); await tap(page, x, y); }
  await page.waitForTimeout(1500);
  const s = await page.evaluate(() => ({ hash: decodeURIComponent(location.hash), modal: document.querySelectorAll('.modal-back').length, screen: document.body.dataset.screen }));
  await shot(page, `galeria/r2/home-${TAPS}x${GAP}-${size}-${name}`);
  ok(s.hash === expect && s.modal === 0 && chooser === c0, `[${size}] ${TAPS} toques (${GAP} ms) en ${name} → ${JSON.stringify(s)} selector de archivos: ${chooser - c0}`);
}
// Volver al inicio con doble toque en la casita desde la galería y desde la pizarra
for (const from of ['obras', 'pizarra']) {
  await page.goto('about:blank');
  await page.goto(appUrl(from));
  await page.waitForTimeout(1300);
  const [x, y] = await center(page, '.btn-home');
  await tap(page, x, y); await page.waitForTimeout(110); await tap(page, x, y);
  await page.waitForTimeout(1200);
  const h = await page.evaluate(() => location.hash);
  ok(h === '#inicio', `[${size}] doble toque en la casita desde ${from} → ${h}`);
}
ok(clean(t.errors).length === 0, 'sin errores ' + JSON.stringify(clean(t.errors)).slice(0, 300));
await t.close();
