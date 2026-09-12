// (corrección 1) La app pasa a segundo plano (visibilitychange hidden) y el sistema la mata enseguida
// (se cierra el navegador sin eventos de descarga): lo pintado tiene que volver al abrir de nuevo.
import path from 'node:path'; import fs from 'node:fs'; import os from 'node:os';
import { launch, appUrl, ready, hitSel, paintAt, samplePaint, filterErrors } from './common.mjs';
const size = process.argv[2] || 'tablet';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-bg-'));
const out = {};
let t = await launch({ size, persistent: profile });
let page = t.page;
await page.goto(appUrl('colorear/leon')); await ready(page); await page.waitForTimeout(300);
await hitSel(t, '.cl-sw[aria-label="Violeta"]'); await paintAt(t, 0.04, 0.5, 30);
out.pending = await page.evaluate(() => {
  const t0 = performance.now();
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
  return [Math.round(performance.now() - t0), Object.keys(localStorage).filter((k) => k.includes('pendiente'))];
});
await t.close();   // "el sistema mata la app": sin pagehide ni esperar el guardado
t = await launch({ size, persistent: profile }); page = t.page;
await page.goto(appUrl('dibujos/selva')); await page.waitForTimeout(1500);
out.catalogBadge = await page.evaluate(() => document.querySelectorAll('.dj-progress').length);
await page.goto(appUrl('colorear/leon')); await ready(page); await page.waitForTimeout(300);
out.after = await samplePaint(page, [[0.04, 0.5]]);
out.pendingLeft = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('pendiente')));
out.errors = filterErrors(t.errors);
console.log(size, JSON.stringify(out));
await t.close();
fs.rmSync(profile, { recursive: true, force: true });
