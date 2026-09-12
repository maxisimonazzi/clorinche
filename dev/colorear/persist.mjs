// Persistencia: pintar, recargar, cerrar el navegador y volver a abrir; ¡Terminé!; exportar; imagen subida.
import { launch, appUrl, shot, stroke, saveDataUrl, SHOTS } from '../lib.mjs';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
const size = process.argv[2] || 'desktop';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-persist-'));
const out = {};
const ready = (page) => page.waitForFunction(() => document.querySelectorAll('.screen').length === 1 && document.querySelector('.screen--colorear.cl-ready'), null, { timeout: 10000 });
const P = async (page, fx, fy) => { const b = await page.evaluate(() => document.querySelector('.cl-board').getBoundingClientRect().toJSON()); return [b.x + b.width * fx, b.y + b.height * fy]; };
const sample = (page) => page.evaluate(() => {
  const c = CL.coloring.screen.painter.canvas; const ctx = c.getContext('2d');
  const pts = [[0.08, 0.08], [0.65, 0.57], [0.29, 0.28], [0.31, 0.46], [0.5, 0.5]];
  return pts.map(([fx, fy]) => Array.from(ctx.getImageData(Math.round(c.width * fx), Math.round(c.height * fy), 1, 1).data).join(','));
});

let t = await launch({ size, persistent: profile });
let page = t.page;
// Imagen "subida" de prueba (blanco y negro puro, 1200x800), guardada directo en IndexedDB.
await page.goto(appUrl('inicio'));
await page.waitForTimeout(400);
out.uploadId = await page.evaluate(async () => {
  const c = CL.util.canvas(1200, 800), x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 1200, 800);
  x.strokeStyle = '#000'; x.lineWidth = 14;
  x.beginPath(); x.arc(400, 400, 250, 0, 7); x.stroke();
  x.beginPath(); x.rect(700, 200, 380, 400); x.stroke();
  x.beginPath(); x.moveTo(700, 400); x.lineTo(1080, 400); x.stroke();
  x.beginPath(); x.moveTo(150, 400); x.lineTo(650, 400); x.stroke();
  const blob = await CL.util.canvasToBlob(c);
  const thumb = await CL.util.canvasToBlob(CL.util.thumbnail(c, 320));
  const up = await CL.db.uploads.save({ w: 1200, h: 800, blob, thumb });
  return up.id;
});
// Pintar la vaca
await page.goto(appUrl('colorear/vaca'));
await ready(page);
for (const [fx, fy, col] of [[0.08, 0.08, 'Celeste'], [0.65, 0.57, 'Verde'], [0.29, 0.28, 'Amarillo'], [0.31, 0.46, 'Rosa']]) {
  await page.click(`.cl-sw[aria-label="${col}"]`);
  const [x, y] = await P(page, fx, fy); await page.mouse.click(x, y); await page.waitForTimeout(320);
}
await page.click('[aria-label="Pincel"]');
const [sx, sy] = await P(page, 0.45, 0.62), [ex, ey] = await P(page, 0.8, 0.66);
await stroke(page, [[sx, sy], [ex, ey]]);
await page.waitForTimeout(1500); // autoguardado
out.before = await sample(page);
out.workAfterPaint = await page.evaluate(async () => (await CL.db.works.list({ kind: 'colorear' })).map((w) => [w.source, w.status, w.w, w.h, w.paint && w.paint.size]));
await page.reload();
await ready(page);
await page.waitForTimeout(300);
out.afterReload = await sample(page);
await shot(page, `colorear/persist-${size}-1-recargado`);
await t.close();

// Cerrar y volver a abrir el navegador (mismo perfil = mismo disco)
t = await launch({ size, persistent: profile });
page = t.page; page.on('console', (m) => { if (m.type() !== 'log') console.log('CONSOLE', m.type(), m.text()); });
await page.goto(appUrl('colorear/vaca'));
await ready(page);
await page.waitForTimeout(300);
out.afterRestart = await sample(page);
out.sameAfterReload = JSON.stringify(out.before) === JSON.stringify(out.afterReload);
out.sameAfterRestart = JSON.stringify(out.before) === JSON.stringify(out.afterRestart);
// ¡Terminé! con captura en medio del festejo
await page.click('.cl-done');
await page.waitForTimeout(650);
await shot(page, `colorear/persist-${size}-2-festejo`);
await page.waitForFunction(() => location.hash.startsWith('#obras/'), null, { timeout: 8000 });
out.hashAfterDone = await page.evaluate(() => location.hash);
const doneId = out.hashAfterDone.split('/')[1];
out.doneWork = await page.evaluate(async (id) => { const w = await CL.db.works.get(id); return [w.status, w.source, !!w.thumb]; }, doneId);
// Exportar a PNG completo
const png = await page.evaluate(async (id) => {
  const w = await CL.db.works.get(id); const b = await CL.coloring.exportPNG(w);
  return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
}, doneId);
saveDataUrl(png, path.join(SHOTS, 'colorear', `persist-${size}-3-export.png`));
// La vaca vuelve a empezar en blanco; la obra terminada se reabre con su id
await page.goto(appUrl('colorear/vaca'));
await ready(page); await page.waitForTimeout(200);
out.freshStart = await sample(page);
await page.goto(appUrl('colorear/vaca/' + doneId));
await ready(page); await page.waitForTimeout(200);
out.reopenDone = JSON.stringify(await sample(page)) === JSON.stringify(out.before);
// Imagen subida: pintar, recargar
await page.goto(appUrl('colorear/u-' + out.uploadId));
await ready(page); await page.waitForTimeout(200);
out.uploadDims = await page.evaluate(() => [CL.coloring.screen.painter.w, CL.coloring.screen.painter.h, CL.coloring.screen.painter.regions.count]);
for (const [fx, fy, col] of [[0.33, 0.4, 'Rojo'], [0.33, 0.6, 'Azul'], [0.75, 0.4, 'Amarillo'], [0.75, 0.6, 'Verde'], [0.02, 0.02, 'Lila']]) {
  await page.click(`.cl-sw[aria-label="${col}"]`);
  const [x, y] = await P(page, fx, fy); await page.mouse.click(x, y); await page.waitForTimeout(320);
}
out.flushProbe = await page.evaluate(async () => {
  const p = CL.coloring.screen.painter;
  const race = (pr, ms) => Promise.race([pr.then(() => 'ok'), new Promise((r) => setTimeout(() => r('TIMEOUT'), ms))]);
  return { toBlob: await race(p.toBlob(), 4000), thumb: await race(p.thumbBlob(480), 4000), flush: await race(CL.coloring.screen.flush(), 6000) };
});
const tSave = Date.now();
await page.waitForFunction(async (u) => !!(await CL.db.works.findProgress('colorear', 'u-' + u)), out.uploadId, { timeout: 8000, polling: 100 });
out.uploadSavedAfterMs = Date.now() - tSave;
out.uploadBeforeReload = await page.evaluate(async () => [CL.coloring.screen && CL.coloring.screen.painter.historyLength, location.hash, (await CL.db.works.list()).map((w) => w.source + ':' + w.status)]);
await page.reload(); await ready(page); await page.waitForTimeout(300);
await shot(page, `colorear/persist-${size}-4-subida-recargada`);
out.uploadProgress = await page.evaluate(async (u) => !!(await CL.db.works.findProgress('colorear', 'u-' + u)), out.uploadId);
out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
fs.rmSync(profile, { recursive: true, force: true });
