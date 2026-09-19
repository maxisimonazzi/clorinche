// Neón: autoguardado, recarga, ¡Terminé!, reabrir por id, exportPNG, "borrar todo" en progreso.
import { launch, appUrl, shot, stroke, rect, saveDataUrl, SHOTS } from '../lib.mjs';
import path from 'node:path';
import fs from 'node:fs';

const prof = path.join(SHOTS, 'neon', '_perfil');
fs.rmSync(prof, { recursive: true, force: true });
const t = await launch({ size: 'desktop', persistent: prof });
const { page } = t;
const out = {};
const ready = () => page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
await page.goto(appUrl('neon'));
await ready();
out.inicial = await page.evaluate(async () => (await CL.db.works.list({ kind: 'neon' })).length);
let r = await rect(page, '.neon-stage');
await page.locator('.neon-mirror').nth(3).click();
await page.locator('.neon-swatch').nth(4).click();
await stroke(page, [[r.x + r.width * 0.55, r.y + r.height * 0.3], [r.x + r.width * 0.7, r.y + r.height * 0.45], [r.x + r.width * 0.6, r.y + r.height * 0.2]], { steps: 30 });
const t0 = Date.now();
while (Date.now() - t0 < 8000 && !(await page.evaluate(async () => (await CL.db.works.list({ kind: 'neon' })).length))) await page.waitForTimeout(100);
out.msHastaGuardar = Date.now() - t0;
out.trasTrazo = await page.evaluate(async () => (await CL.db.works.list({ kind: 'neon' })).map((w) => ({ id: w.id, status: w.status, w: w.w, h: w.h, paint: w.paint.size, thumb: w.thumb.size, meta: w.meta })));
await shot(page, 'neon/guardado-1-antes');
await page.reload();
await ready();
await page.waitForTimeout(300);
await shot(page, 'neon/guardado-2-recargado');
out.recargado = await page.evaluate(() => CL.neon.debug);
// Seguir dibujando y terminar.
await page.locator('.neon-swatch').nth(1).click();
await stroke(page, [[r.x + r.width * 0.5 + 20, r.y + r.height * 0.8], [r.x + r.width * 0.8, r.y + r.height * 0.7]], { steps: 20 });
await page.locator('.neon-done').click();
await page.waitForTimeout(700);
await shot(page, 'neon/guardado-3-festejo');
await page.waitForTimeout(2600);
out.trasTerminar = await page.evaluate(async () => ({ hash: location.hash, works: (await CL.db.works.list({ kind: 'neon' })).map((w) => w.id + ':' + w.status) }));
const doneId = out.trasTerminar.works[0].split(':')[0];
// Export
const exp = await page.evaluate(async (id) => {
  const w = await CL.db.works.get(id);
  const b = await CL.neon.exportPNG(w);
  const img = await CL.util.blobToImage(b);
  const fr = new FileReader();
  const url = await new Promise((res) => { fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
  const th = await new Promise((res) => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(w.thumb); });
  return { type: b.type, size: b.size, w: img.width, h: img.height, url, th };
}, doneId);
saveDataUrl(exp.url, path.join(SHOTS, 'neon', 'guardado-export.png'));
saveDataUrl(exp.th, path.join(SHOTS, 'neon', 'guardado-thumb.png'));
out.export = { type: exp.type, size: exp.size, w: exp.w, h: exp.h };
// Volver a #neon: empieza en blanco.
await page.evaluate(() => CL.router.go('neon'));
await ready();
out.neonNuevo = await page.evaluate(() => CL.neon.debug);
await shot(page, 'neon/guardado-4-nuevo');
// Reabrir la terminada.
await page.evaluate((id) => CL.router.go('neon/' + id), doneId);
await page.waitForFunction((id) => CL.neon.debug && CL.neon.debug.ready && CL.neon.debug.workId === id, doneId);
out.reabierta = await page.evaluate(() => CL.neon.debug);
await shot(page, 'neon/guardado-5-reabierta');
// Nuevo trazo en progreso y "borrar todo": la obra en progreso se quita.
await page.evaluate(() => CL.router.go('neon'));
await ready();
r = await rect(page, '.neon-stage');
await stroke(page, [[r.x + 100, r.y + 100], [r.x + 300, r.y + 200]], { steps: 10 });
await page.waitForTimeout(2500);
out.antesBorrar = await page.evaluate(async () => (await CL.db.works.list({ kind: 'neon' })).map((w) => w.status));
const b = await rect(page, '.neon-clear');
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
await page.mouse.down(); await page.waitForTimeout(1350); await page.mouse.up();
await page.waitForTimeout(350);
await shot(page, 'neon/guardado-6-apagando');
await page.waitForTimeout(1200);
out.despuesBorrar = await page.evaluate(async () => ({ list: (await CL.db.works.list({ kind: 'neon' })).map((w) => w.status), st: CL.neon.debug }));
// ¡Terminé! vacío -> "nope", no navega.
await page.locator('.neon-done').click();
await page.waitForTimeout(300);
out.terminarVacio = await page.evaluate(() => location.hash);
// Salir con trazo sin esperar el debounce: unmount guarda.
await stroke(page, [[r.x + 200, r.y + 300], [r.x + 400, r.y + 250]], { steps: 10 });
await page.evaluate(() => CL.router.go('inicio'));
await page.waitForTimeout(800);
out.alSalir = await page.evaluate(async () => (await CL.db.works.list({ kind: 'neon' })).map((w) => w.status));
out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
