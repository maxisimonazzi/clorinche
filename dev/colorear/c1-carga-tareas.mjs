// Corrección 1 — qué tareas largas hay al abrir un dibujo (CPU x4) y en qué paso de la carga caen.
import { launch, appUrl } from '../lib.mjs';
import { ready } from '../review-colorear/common.mjs';
const t = await launch({ size: 'tablet' });
const { page } = t;
const cdp = await page.context().newCDPSession(page);
await page.goto(appUrl('dibujos/fantasia'));
await page.waitForTimeout(1500);
await page.evaluate(() => {
  window.__log = []; const T0 = performance.now();
  const L = (s) => window.__log.push(Math.round(performance.now() - T0) + ' ' + s);
  new PerformanceObserver((l) => { for (const e of l.getEntries()) L('LONGTASK ' + Math.round(e.startTime - T0) + '..+' + Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] });
  const wrap = (obj, k) => { const f = obj[k]; obj[k] = function (...a) { L('> ' + k); const r = f.apply(this, a); if (r && r.then) r.then(() => L('< ' + k)); else L('< ' + k); return r; }; };
  wrap(CL.coloring, 'loadSource'); wrap(CL.coloring, 'rasterLines'); wrap(CL.regions, 'computeAsync'); wrap(CL.coloring, 'createPainter');
  window.__L = L;
});
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.evaluate(() => { window.__L('go'); CL.router.go('colorear/dragon'); });
await ready(page, 60000);
await page.evaluate(() => window.__L('ready'));
await page.waitForTimeout(3000);
console.log((await page.evaluate(() => window.__log)).join('\n'));
await t.close();
