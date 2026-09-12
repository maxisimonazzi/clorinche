// Revisión QA 2 — fluidez: fps y cuadros largos durante pincel (liso/especial, con recorte), pellizco y balde grande.
import { launch, appUrl } from '../lib.mjs';
import { ready, P, hitSel, filterErrors } from '../review-colorear/common.mjs';

const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
const cdp = await page.context().newCDPSession(page);
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p) => ({ x: p[0], y: p[1], id: p[2] ?? 1 })) });
const log = (k, v) => console.log(`[${size}] ${k}`, JSON.stringify(v));

await page.goto(appUrl('colorear/dragon'));
await ready(page);
await page.waitForTimeout(300);
log('zonasMs', await page.evaluate(() => CL.coloring.stats.regionsMs));

const startMeter = () => page.evaluate(() => {
  window.__fr = []; let last = performance.now();
  const f = (now) => { window.__fr.push(now - last); last = now; if (window.__fr.length < 100000 && !window.__stop) requestAnimationFrame(f); };
  window.__stop = false; requestAnimationFrame(f);
});
const stopMeter = () => page.evaluate(() => {
  window.__stop = true; const fr = window.__fr.slice(1); const tot = fr.reduce((a, b) => a + b, 0);
  return { fps: Math.round(fr.length / (tot / 1000)), peorMs: Math.round(Math.max(...fr)), cuadros: fr.length };
});

async function scribble(label, ms = 2000) {
  const c = await P(page, 0.5, 0.55);
  const r = 120;
  await startMeter();
  await touch('touchStart', [[c[0] + r, c[1]]]);
  const t0 = Date.now();
  let i = 0;
  while (Date.now() - t0 < ms) {
    const a = i * 0.12; i++;
    await touch('touchMove', [[c[0] + Math.cos(a) * r * (0.5 + 0.5 * Math.sin(a * 0.3)), c[1] + Math.sin(a) * r]]);
  }
  await touch('touchEnd', []);
  log(label, Object.assign(await stopMeter(), { eventos: i }));
}

await hitSel(t, '[aria-label="Pincel"]');
await scribble('pincel liso con recorte');
await hitSel(t, '.cl-clip');
await scribble('pincel liso sin recorte');
await hitSel(t, '.cl-sp[data-kind="sparkle"]');
await scribble('pincel brillitos sin recorte');
await hitSel(t, '.cl-clip');
await scribble('pincel brillitos con recorte');
await hitSel(t, '.cl-sp[data-kind="rainbow"]');
await scribble('pincel arcoiris con recorte');

// Pellizco sostenido 2 s
const c = await P(page, 0.5, 0.5);
await startMeter();
await touch('touchStart', [[c[0] - 30, c[1], 1], [c[0] + 30, c[1], 2]]);
const t0 = Date.now(); let i = 0;
while (Date.now() - t0 < 2000) { const d = 30 + 120 * Math.abs(Math.sin(i++ * 0.05)); await touch('touchMove', [[c[0] - d, c[1], 1], [c[0] + d, c[1], 2]]); }
await touch('touchEnd', []);
log('pellizco', await stopMeter());

// Balde en el fondo con brillitos (zona más grande) mientras se mide
await hitSel(t, '[aria-label="Ver todo el dibujo"]');
await page.waitForTimeout(400);
await hitSel(t, '[aria-label="Balde de pintura"]');
await hitSel(t, '.cl-sp[data-kind="sparkle"]');
const bg = await P(page, 0.03, 0.03);
await startMeter();
await touch('touchStart', [[...bg]]); await touch('touchEnd', []);
await page.waitForTimeout(700);
log('balde fondo brillitos', await stopMeter());
log('errores', filterErrors(t.errors));
await t.close();
