// (corrección 1) Guardado de emergencia: recargar / cerrar enseguida después de pintar, en varios casos.
import path from 'node:path'; import fs from 'node:fs'; import os from 'node:os';
import { launch, appUrl, shot, ready, P, hit, hitSel, paintAt, samplePaint, stroke, multiStroke, filterErrors } from './common.mjs';
const size = process.argv[2] || 'tablet';
const rate = +(process.argv[3] || 1);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-emer-'));
const out = {};
const works = (page) => page.evaluate(async () => (await CL.db.works.list({ kind: 'colorear' })).map((w) => `${w.source}:${w.status}:${w.id.slice(-4)}`));
const pendingKeys = (page) => page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('pendiente')).map((k) => k + ' ' + localStorage.getItem(k).length));
let t = await launch({ size, persistent: profile });
let page = t.page;
const cdp = await page.context().newCDPSession(page);
const throttle = async (p) => { if (rate > 1) { const c = await p.context().newCDPSession(p); await c.send('Emulation.setCPUThrottlingRate', { rate }); } };
const drag = async (pts) => {
  const abs = [];
  for (const [fx, fy] of pts) abs.push(await P(page, fx, fy));
  if (t.size.touch) await multiStroke(page, [abs], { steps: 20 }); else await stroke(page, abs, { steps: 20 });
};
const open = async (hash) => { await page.goto(appUrl(hash)); await ready(page); await page.waitForTimeout(250); await throttle(page); };

// 1) Pincel y recarga inmediata (0 ms)
await open('colorear/gato');
await hitSel(t, '[aria-label="Pincel"]'); await hitSel(t, '.cl-sw[aria-label="Rojo"]');
await hitSel(t, '[aria-label="No salirse de las líneas"]');
await drag([[0.1, 0.1], [0.9, 0.12]]);
out.stroke = await samplePaint(page, [[0.5, 0.11]]);
// cuánto tarda el guardado de emergencia (síncrono)
out.emergencyMs = await page.evaluate(() => {
  const p = CL.coloring.screen.painter; const t0 = performance.now(); const u = p.toDataURL(); return [Math.round(performance.now() - t0), u.length];
});
await page.reload(); await ready(page); await page.waitForTimeout(300);
out.strokeAfterReload = await samplePaint(page, [[0.5, 0.11]]);
out.pendingAfterReload = await pendingKeys(page);
await hitSel(t, '[aria-label="No salirse de las líneas"]');

// 2) Balde y recarga a 0 ms dos veces seguidas (el segundo sobre la obra ya creada)
await hitSel(t, '[aria-label="Balde de pintura"]');
await hitSel(t, '.cl-sw[aria-label="Azul"]'); await paintAt(t, 0.03, 0.5, 0);
await page.reload(); await ready(page); await page.waitForTimeout(300);
await hitSel(t, '.cl-sw[aria-label="Verde"]'); await paintAt(t, 0.03, 0.5, 0);
await page.reload(); await ready(page); await page.waitForTimeout(300);
out.twoReloads = await samplePaint(page, [[0.03, 0.5], [0.5, 0.11]]);
out.worksAfter2 = await works(page);

// 3) Después de un guardado normal no queda nada anotado
await page.waitForTimeout(1500);
out.pendingIdle = await pendingKeys(page);

// 4) Obra terminada reabierta desde su id: pintar y recargar enseguida -> sigue 'done', sin duplicados
await hitSel(t, '.cl-done'); await page.waitForFunction(() => location.hash.startsWith('#obras/'), null, { timeout: 10000 });
const doneId = (await page.evaluate(() => location.hash)).split('/')[1];
await open('colorear/gato/' + doneId);
await hitSel(t, '.cl-sw[aria-label="Amarillo"]'); await paintAt(t, 0.03, 0.5, 0);
await page.reload(); await ready(page); await page.waitForTimeout(300);
out.doneReopened = await samplePaint(page, [[0.03, 0.5]]);
out.worksAfterDone = await works(page);

// 5) Catálogo después de recargar (la miniatura del gato muestra lo último)
await open('colorear/perro');
await hitSel(t, '.cl-sw[aria-label="Rosa fuerte"]'); await paintAt(t, 0.03, 0.5, 0);
await page.goto(appUrl('dibujos/mascotas')); await page.waitForTimeout(1500);
await shot(page, `colorear/emer-${size}-catalogo`);
out.catalogProgress = await page.evaluate(() => document.querySelectorAll('.dj-progress').length);

// 6) Imagen subida: pintar y recargar enseguida
const upId = await page.evaluate(async () => {
  const c = CL.util.canvas(1000, 700), x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 1000, 700); x.strokeStyle = '#000'; x.lineWidth = 14;
  x.beginPath(); x.arc(500, 350, 250, 0, 7); x.stroke();
  const up = await CL.db.uploads.save({ w: 1000, h: 700, blob: await CL.util.canvasToBlob(c), thumb: await CL.util.canvasToBlob(CL.util.thumbnail(c, 320)) });
  return up.id;
});
await open('colorear/u-' + upId);
await hitSel(t, '.cl-sw[aria-label="Naranja"]'); await paintAt(t, 0.5, 0.5, 0);
await page.reload(); await ready(page); await page.waitForTimeout(300);
out.upload = await samplePaint(page, [[0.5, 0.5]]);

// 7) Cerrar la pestaña (runBeforeUnload) 50 ms después del balde
await hitSel(t, '.cl-sw[aria-label="Violeta"]'); await paintAt(t, 0.02, 0.02, 50);
const p2 = await t.context.newPage();
await page.close({ runBeforeUnload: true });
await p2.waitForTimeout(600);
page = p2;
await page.goto(appUrl('colorear/u-' + upId)); await ready(page); await page.waitForTimeout(300);
out.closeTab = await samplePaint(page, [[0.02, 0.02], [0.5, 0.5]]);
await shot(page, `colorear/emer-${size}-subida-recuperada`);
out.pendingEnd = await pendingKeys(page);
out.errors = filterErrors(t.errors);
console.log(size, 'x' + rate, JSON.stringify(out, null, 1));
await t.close();
fs.rmSync(profile, { recursive: true, force: true });
