// Rotar / redimensionar: el dibujo no se pierde (se escala para entrar). Abrir la obra en otra pantalla.
// Lápiz óptico con presión (CDP con pointerType 'pen').
import { launch, appUrl, shot, stroke } from '../lib.mjs';
import { ready, board, at, wave, T, resetDb } from './common.mjs';

const t = await launch({ size: 'tablet' });
const { page } = t;
const out = {};
await page.goto(appUrl('pizarra'));
await ready(page);
await resetDb(page);
await page.reload();
await ready(page);
const api = T(page);
let b = await board(page);
await api.tool('fibra'); await api.color('#8b4dff'); await api.size(3);
await stroke(page, [at(b, 0.05, 0.05), at(b, 0.95, 0.95)], { pointer: 'touch', steps: 30 });
await stroke(page, [at(b, 0.95, 0.05), at(b, 0.05, 0.95)], { pointer: 'touch', steps: 30 });
await api.tool('sellos');
await stroke(page, [at(b, 0.5, 0.5), at(b, 0.5, 0.5)], { pointer: 'touch', steps: 1 });
await page.waitForTimeout(500);
out.land = await api.info();
await shot(page, 'pizarra/rotate/1-land');
// Rotar a vertical
await page.setViewportSize({ width: 768, height: 1024 });
await page.waitForTimeout(600);
out.port = await api.info();
out.portBoard = await board(page);
await shot(page, 'pizarra/rotate/2-port');
// Dibujar en vertical (mapeo de coordenadas con escala ≠ 1)
b = await board(page);
await api.tool('crayon'); await api.color('#ff8a1f'); await api.size(2);
await stroke(page, wave(b, 0.5, 0.1, 0.9, 0.1), { pointer: 'touch', steps: 30 });
await page.waitForTimeout(300);
await shot(page, 'pizarra/rotate/3-port-drawn');
// Volver a horizontal
await page.setViewportSize({ width: 1024, height: 768 });
await page.waitForTimeout(600);
out.back = await api.info();
await shot(page, 'pizarra/rotate/4-land-again');
// Guardar y abrir la obra por id en un celular
await page.evaluate(() => CL.pizarra.current.save());
const id = await page.evaluate(() => CL.pizarra.current.work.id);
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate((id) => CL.router.go('pizarra/' + id), id);
await page.waitForTimeout(300);
await ready(page);
out.phoneOpen = await api.info();
await shot(page, 'pizarra/rotate/5-open-on-phone');
// pizarra/<id> inexistente vuelve a #pizarra
await page.evaluate(() => CL.router.go('pizarra/noexiste'));
await page.waitForTimeout(800);
out.badId = await page.evaluate(() => location.hash);

// Lápiz óptico: presión creciente = trazo más grueso
await page.setViewportSize({ width: 1024, height: 768 });
await page.evaluate(() => CL.router.go('inicio'));
await page.waitForTimeout(300);
await resetDb(page);
await page.evaluate(() => CL.router.go('pizarra'));
await ready(page);
b = await board(page);
await api.tool('fibra'); await api.color('#2f5bea'); await api.size(2);
const cdp = await page.context().newCDPSession(page);
const y = b.y + b.height * 0.5;
const x0 = b.x + b.width * 0.1, x1 = b.x + b.width * 0.9;
await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x0, y, button: 'left', clickCount: 1, pointerType: 'pen', force: 0.05 });
for (let i = 1; i <= 40; i++) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x0 + ((x1 - x0) * i) / 40, y, button: 'left', buttons: 1, pointerType: 'pen', force: 0.05 + (0.95 * i) / 40 });
  await page.waitForTimeout(10);
}
await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x1, y, button: 'left', clickCount: 1, pointerType: 'pen' });
await page.waitForTimeout(300);
await shot(page, 'pizarra/rotate/6-pen-pressure', { clip: b });
out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
