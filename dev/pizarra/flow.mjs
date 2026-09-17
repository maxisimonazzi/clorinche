// Flujo completo de la pizarra en un tamaño: multitouch, sellos, selectores, deshacer, borrar todo (3 momentos),
// guardado + recarga, ¡Terminé! con festejo, y fps dibujando.
// Uso: node pizarra/flow.mjs [tamaño]
import { launch, appUrl, shot, stroke, multiStroke, tap, SIZES } from '../lib.mjs';
import { ready, board, at, wave, T, resetDb } from './common.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const size = process.argv[2] || 'tablet';
const touch = SIZES[size].touch;
const pointer = touch ? 'touch' : 'mouse';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pz-'));
const t = await launch({ size, persistent: profile });
const { page } = t;
const out = { size };
const S = (n) => shot(page, `pizarra/flow/${size}-${n}`);
const click = async (sel) => {
  const r = await page.locator(sel).first().boundingBox();
  if (touch) await tap(page, r.x + r.width / 2, r.y + r.height / 2);
  else await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
  await page.waitForTimeout(250);
};

await page.goto(appUrl('pizarra'));
await ready(page);
await resetDb(page);
await page.reload();
await ready(page);
const api = T(page);
let b = await board(page);

// 1) Herramienta y color por la interfaz real (toques)
await click('.pz-tool[data-tool="fibra"]');
await click('.pz-swatch[data-color="#2f5bea"]');
await click('.pz-size:nth-child(3)');
out.uiSelect = await page.evaluate(() => CL.pizarra.current.state);

// 2) Multitouch: 3 dedos a la vez (en touch) o 3 trazos seguidos con mouse
const paths = [wave(b, 0.25, 0.08, 0.9, 0.06), wave(b, 0.45, 0.1, 0.92, -0.06), wave(b, 0.65, 0.06, 0.88, 0.05)];
if (touch) {
  await api.tool('crayon'); await api.color('#ff3b30');
  await multiStroke(page, paths, { steps: 30, delay: 12 });
} else {
  for (const p of paths) await stroke(page, p, { steps: 30 });
}
await page.waitForTimeout(250);
out.afterMulti = await api.info();
await S('1-multitouch');

// 3) Sellos: el selector se abre al tocar la herramienta
await click('.pz-tool[data-tool="sellos"]');
await page.waitForTimeout(300);
await S('2-stamp-picker');
await click('.pz-pick[aria-label="Gato"]');
out.stamp = await page.evaluate(() => CL.pizarra.current.state.stamp);
await api.color('multi');
await api.size(1);
const p1 = at(b, 0.2, 0.85);
await stroke(page, [p1, p1], { pointer, steps: 1 });
await page.waitForTimeout(90);
await S('3-stamp-pop-mid'); // en medio del "pop"
await stroke(page, [at(b, 0.35, 0.85), at(b, 0.9, 0.85)], { pointer, steps: 24, delay: 14 });
await page.waitForTimeout(500);
await S('4-stamps');

// 4) Fondo: selector y cambio (no borra el dibujo)
await click('.pz-bgbtn');
await page.waitForTimeout(300);
await S('5-bg-picker');
await click('.pz-pick[aria-label="Pizarrón verde"]');
await page.waitForTimeout(300);
await api.tool('brillitos');
await api.color('multi');
await stroke(page, wave(b, 0.1, 0.1, 0.9, 0.03), { pointer, steps: 30, delay: 12 });
await page.waitForTimeout(120);
await S('6-bg-chalk-brillitos');

// 5) Deshacer
const u0 = await api.info();
await click('.pz-undo');
await page.waitForTimeout(200);
const u1 = await api.info();
out.undo = { before: u0.undo, after: u1.undo };
await S('7-after-undo');

// 6) Guardado y recarga: todo sigue ahí
await page.waitForTimeout(1300);
await page.evaluate(() => CL.pizarra.current.save());
out.saved = await page.evaluate(async () => (await CL.db.works.list({ kind: 'pizarra' })).map((w) => ({ id: w.id, status: w.status, bg: w.meta.bg, w: w.w, h: w.h })));
const before = await page.evaluate(() => CL.pizarra.current._test.layer.toDataURL().length);
await page.reload();
await ready(page);
await page.waitForTimeout(300);
out.afterReload = await api.info();
out.afterReload.bg = await page.evaluate(() => CL.pizarra.current.state.bg);
out.afterReload.sameSize = before === (await page.evaluate(() => CL.pizarra.current._test.layer.toDataURL().length));
await S('8-after-reload');

// 7) fps dibujando (aerosol + fibra con dedo) — rAF contados dentro de la página
b = await board(page);
await api.tool('fibra');
await page.evaluate(() => {
  window.__frames = 0; window.__t0 = performance.now();
  const f = () => { window.__frames++; if (performance.now() - window.__t0 < 2000) requestAnimationFrame(f); };
  requestAnimationFrame(f);
});
const t0 = Date.now();
while (Date.now() - t0 < 2000) {
  await stroke(page, wave(b, 0.3 + Math.random() * 0.4, 0.1, 0.9, 0.08), { pointer, steps: 20, delay: 4 });
}
out.fpsDrawing = await page.evaluate(() => Math.round((window.__frames * 1000) / (performance.now() - window.__t0)));

// 8) Borrar todo con la barrita (manteniendo apretado el botón)
// (la barrita se hace 3× más lenta sólo para poder sacar las capturas en medio de la animación)
await page.evaluate(() => { CL.pizarra.current._test.wipeMs = 2700; });
const cb = await page.locator('.pz-clear').boundingBox();
const cx = cb.x + cb.width / 2, cy = cb.y + cb.height / 2;
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.waitForFunction(() => document.querySelector('.pz-board').classList.contains('pz-wiping'), null, { timeout: 3000 });
const tw = Date.now();
await page.mouse.up();
out.wipeShots = [];
for (const [k, ms] of [['a', 550], ['b', 1350], ['c', 2100]]) {
  const wait = ms - (Date.now() - tw);
  if (wait > 0) await page.waitForTimeout(wait);
  out.wipeShots.push(k + '@' + (Date.now() - tw) + 'ms');
  await S('9-wipe-' + k);
}
await page.waitForTimeout(1000);
await page.evaluate(() => { CL.pizarra.current._test.wipeMs = 900; });
out.afterWipe = await api.info();
await S('10-after-wipe');
// deshacer el borrado lo recupera
await click('.pz-undo');
out.afterWipeUndo = await api.info();

// 9) ¡Terminé!: festejo y a la galería
await click('.pz-done');
await page.waitForTimeout(700);
await S('11-celebrate');
await page.waitForFunction(() => location.hash.startsWith('#obras'), null, { timeout: 10000 }).catch(() => {});
out.hashAfterDone = await page.evaluate(() => location.hash);
out.worksAfterDone = await page.evaluate(async () => (await CL.db.works.list({ kind: 'pizarra' })).map((w) => w.status));
// La próxima vez la pizarra arranca en blanco
await page.evaluate(() => CL.router.go('pizarra'));
await ready(page);
out.nextTime = await api.info();
await S('12-next-blank');
out.exportPNG = await page.evaluate(async () => {
  const w = (await CL.db.works.list({ kind: 'pizarra', status: 'done' }))[0];
  const blob = await CL.pizarra.exportPNG(w);
  const img = await CL.util.blobToImage(blob);
  return { type: blob.type, bytes: blob.size, w: img.width, h: img.height };
});
out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
fs.rmSync(profile, { recursive: true, force: true });
