// Corrección 1 — tareas largas (longtask) durante: carga de un dibujo, guardado y salida, y primer balde
// con brillitos en el fondo. CPU normal y 4 veces más lenta (tablet económica).
import { launch, appUrl } from '../lib.mjs';
import { ready, P, tap, filterErrors } from '../review-colorear/common.mjs';
const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
const cdp = await page.context().newCDPSession(page);
await page.goto(appUrl('inicio'));
await page.waitForTimeout(500);
await page.evaluate(() => {
  window.__lt = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] });
});
const take = () => page.evaluate(() => { const a = window.__lt.splice(0); return { n: a.length, peor: a.length ? Math.max(...a) : 0, todas: a }; });
for (const rate of [1, 4]) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await take();
  await page.evaluate(() => CL.router.go('colorear/dragon'));
  await ready(page, 60000);
  await page.waitForTimeout(2500 * rate / 2);   // deja que se prepare la máscara del fondo en ratos libres
  const carga = await take();
  // Primer balde con brillitos en el fondo.
  await page.evaluate(() => { document.querySelector('.cl-sp[data-kind="sparkle"]').click(); });
  const bg = await P(page, 0.02, 0.02);
  await tap(page, bg[0], bg[1]);
  await page.waitForTimeout(900);
  const balde = await take();
  // Guardado (ya empezó a los 250 ms) + salida.
  const t0 = Date.now();
  await page.evaluate(() => CL.router.go('dibujos/fantasia'));
  await page.waitForFunction(() => !!document.querySelector('.screen--dibujos .dj-item'), null, { timeout: 30000, polling: 16 });
  const catalogo = Date.now() - t0;
  await page.waitForTimeout(1500);
  const salida = await take();
  console.log(`[${size}] cpu x${rate}`, JSON.stringify({ carga, balde, salida, msHastaCatalogoConItems: catalogo }));
}
console.log(JSON.stringify(filterErrors(t.errors)));
await t.close();
