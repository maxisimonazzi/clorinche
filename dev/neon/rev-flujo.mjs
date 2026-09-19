// Revisión neón: animación de "borrar todo", lápiz con presión, mouse que sale de la pizarra,
// y flujo ¡Terminé! -> galería -> abrir -> seguir -> descargar.
import { launch, appUrl, shot, multiStroke, rect, saveDataUrl, SHOTS } from '../lib.mjs';
import path from 'node:path';

const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
const out = {};
const ready = () => page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
await page.goto(appUrl('neon'));
await ready();
let r = await rect(page, '.neon-stage');
const X = (f) => r.x + r.width * f, Y = (f) => r.y + r.height * f;
const cdp = await page.context().newCDPSession(page);

// 1) Algo lindo con caleidoscopio 6.
await page.locator('.neon-mirror').nth(3).click();
await page.locator('.neon-swatch').nth(8).click();
const p = [];
for (let i = 0; i <= 50; i++) { const a = i / 50 * Math.PI * 2; p.push([X(0.5) + Math.cos(a) * r.width * 0.25 * (0.6 + 0.4 * Math.sin(a * 3)), Y(0.5) + Math.sin(a) * r.height * 0.3 * (0.6 + 0.4 * Math.sin(a * 3))]); }
await multiStroke(page, [p], { steps: 60, delay: 4 });

// 2) Borrar todo: capturas en medio de la animación.
const cb = await rect(page, '.neon-clear');
await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
await page.mouse.down();
await page.waitForTimeout(700);
await shot(page, `neon/rev/flujo/${size}-borrar-1-manteniendo`);
await page.waitForTimeout(600);
await page.mouse.up();
for (const [i, ms] of [[2, 60], [3, 250], [4, 350]]) { await page.waitForTimeout(ms); await shot(page, `neon/rev/flujo/${size}-borrar-${i}`); }
await page.waitForTimeout(800);
await shot(page, `neon/rev/flujo/${size}-borrar-5-fin`);

// 3) Lápiz con presión variable (CDP mouse con pointerType pen).
await page.locator('.neon-mirror').nth(0).click();
await page.locator('.neon-swatch').nth(1).click();
await page.locator('.neon-size').nth(2).click();
const pen = (type, x, y, force) => cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, pointerType: 'pen', force });
await pen('mousePressed', X(0.1), Y(0.3), 0.1);
for (let i = 1; i <= 60; i++) { await pen('mouseMoved', X(0.1 + i * 0.013), Y(0.3 + Math.sin(i / 6) * 0.05), Math.min(1, 0.05 + i / 50)); await page.waitForTimeout(8); }
await pen('mouseReleased', X(0.88), Y(0.3), 0);
await page.waitForTimeout(100);
out.pen = await page.evaluate(() => CL.neon.debug.strokes);

// 4) Mouse que sale de la pizarra con el botón apretado y suelta afuera; después vuelve a entrar sin botón.
await page.mouse.move(X(0.2), Y(0.7));
await page.mouse.down();
await page.mouse.move(X(0.6), Y(0.75), { steps: 8 });
await page.mouse.move(r.x + r.width + 40, Y(0.8), { steps: 6 });
await page.mouse.up();
await page.mouse.move(X(0.7), Y(0.9), { steps: 6 });
out.mouseAfuera = await page.evaluate(() => CL.neon.debug.strokes);
await page.waitForTimeout(100);
await shot(page, `neon/rev/flujo/${size}-lapiz-y-mouse`);

// 5) ¡Terminé! -> galería.
await page.locator('.neon-done').click();
await page.waitForTimeout(900);
await shot(page, `neon/rev/flujo/${size}-festejo`);
await page.waitForFunction(() => location.hash.startsWith('#obras/'), null, { timeout: 8000 });
await page.waitForTimeout(900);
await shot(page, `neon/rev/flujo/${size}-galeria`);
out.hash = await page.evaluate(() => location.hash);
const id = out.hash.split('/')[1];
const exp = await page.evaluate(async (id) => {
  const w = await CL.db.works.get(id);
  const b = await CL.neon.exportPNG(w);
  const f = new FileReader();
  const url = await new Promise((res) => { f.onload = () => res(f.result); f.readAsDataURL(b); });
  return { type: b.type, url };
}, id);
saveDataUrl(exp.url, path.join(SHOTS, 'neon', 'rev', 'flujo', `${size}-export.png`));
out.exportType = exp.type;
// Abrir la obra desde la galería (tocar su miniatura) y seguir.
const card = page.locator(`[data-id="${id}"]`).first();
if (await card.count()) {
  await card.click();
  await page.waitForTimeout(600);
  await shot(page, `neon/rev/flujo/${size}-galeria-vista`);
} else out.sinTarjeta = true;
await page.evaluate((id) => CL.router.go('neon/' + id), id);
await page.waitForFunction((id) => CL.neon.debug && CL.neon.debug.ready && CL.neon.debug.workId === id, id);
await page.waitForTimeout(300);
await shot(page, `neon/rev/flujo/${size}-reabierta`);
out.reabierta = await page.evaluate(() => CL.neon.debug);
out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
