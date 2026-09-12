// Selector de color: cuánto bloquea el hilo principal al abrir (dibujo del mapa píxel a píxel) y cuándo queda opaco.
import { launch, appUrl, shot, ready, hitSel, filterErrors } from './common.mjs';
const size = process.argv[2] || 'tablet';
const rate = +(process.argv[3] || 1);
const t = await launch({ size });
const { page } = t;
const cdp = await page.context().newCDPSession(page);
await page.addInitScript(() => { window.__lt = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); });
await page.goto(appUrl('colorear/jirafa')); await ready(page); await page.waitForTimeout(500);
if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
const t0 = await page.evaluate(() => { window.__lt = []; return performance.now(); });
await hitSel(t, '.cl-pick');
const samples = [];
for (let i = 0; i < 12; i++) {
  samples.push(await page.evaluate((t0) => { const b = document.querySelector('.modal-back'); return b ? [Math.round(performance.now() - t0), getComputedStyle(b).opacity] : [Math.round(performance.now() - t0), 'sin modal']; }, t0));
  if (i === 1) await shot(page, `colorear/sel-${size}-x${rate}-a`);
  await page.waitForTimeout(100);
}
await shot(page, `colorear/sel-${size}-x${rate}-b`);
const lt = await page.evaluate((t0) => window.__lt.map(([s, d]) => [Math.round(s - t0), d]), t0);
const px = await page.evaluate(() => { const c = document.querySelector('.cl-pk-map'); return [c.width, c.height]; });
console.log(size, 'cpu x' + rate, 'mapa px', JSON.stringify(px), 'opacidad', JSON.stringify(samples), 'tareas largas', JSON.stringify(lt), JSON.stringify(filterErrors(t.errors)));
await t.close();

