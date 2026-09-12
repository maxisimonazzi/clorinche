// Multitouch: pellizco para zoom, trazo cancelado al apoyar un segundo dedo, pintar con el dedo.
import { launch, appUrl, shot, tap, multiStroke, touchStart, touches } from '../lib.mjs';
const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
const out = {};
await page.goto(appUrl('colorear/gato'));
await page.waitForFunction(() => document.querySelectorAll('.screen').length === 1 && document.querySelector('.screen--colorear.cl-ready'), null, { timeout: 10000 });
await page.waitForTimeout(300);
const board = () => page.evaluate(() => document.querySelector('.cl-board').getBoundingClientRect().toJSON());
const P = async (fx, fy) => { const b = await board(); return [b.x + b.width * fx, b.y + b.height * fy]; };
const btn = async (label) => { const r = await page.locator(`[aria-label="${label}"]`).first().boundingBox(); await tap(page, r.x + r.width / 2, r.y + r.height / 2); await page.waitForTimeout(80); };
const color = async (name) => { const r = await page.locator(`.cl-sw[aria-label="${name}"]`).boundingBox(); await tap(page, r.x + r.width / 2, r.y + r.height / 2); await page.waitForTimeout(80); };
// pintar con el dedo (balde)
await color('Naranja'); let [x, y] = await P(0.5, 0.45); await tap(page, x, y); await page.waitForTimeout(350);
await color('Celeste'); [x, y] = await P(0.05, 0.05); await tap(page, x, y); await page.waitForTimeout(350);
await shot(page, `colorear/touch-${size}-1-balde`);
// Pincel con el dedo y luego segundo dedo: el trazo se cancela
await btn('Pincel'); await color('Violeta');
const hist0 = await page.evaluate(() => { window.__ev = []; const s = document.querySelector('.cl-stage'); for (const ty of ['pointerdown','pointerup','pointercancel']) s.addEventListener(ty, (e) => window.__ev.push(ty + ' ' + e.pointerId + ' ' + e.target.className.baseVal + e.target.className + ' ' + Math.round(e.clientX) + ',' + Math.round(e.clientY)), true); CL.coloring.screen.painter.events.on('change', (e) => window.__ev.push(e.type + ':' + CL.coloring.screen.view.k.toFixed(2))); return CL.coloring.screen.painter.historyLength; });
const [ax, ay] = await P(0.3, 0.6);
await touchStart(page, [{ x: ax, y: ay, id: 1 }]);
for (let i = 1; i <= 8; i++) { await touches(page, [{ x: ax + i * 12, y: ay, id: 1 }]); await page.waitForTimeout(16); }
await shot(page, `colorear/touch-${size}-2-trazo-a-medias`);
await touchStart(page, [{ x: ax + 96, y: ay, id: 1 }, { x: ax + 96, y: ay - 150, id: 2 }]);
for (let i = 1; i <= 8; i++) { await touches(page, [{ x: ax + 96, y: ay + i * 5, id: 1 }, { x: ax + 96, y: ay - 150 - i * 15, id: 2 }]); await page.waitForTimeout(16); }
await touches(page, []);
await page.waitForTimeout(400);
out.histAfterCancel = (await page.evaluate(() => CL.coloring.screen.painter.historyLength)) - hist0;
out.kAfterCancel = await page.evaluate(() => CL.coloring.screen.view.k);
await shot(page, `colorear/touch-${size}-3-cancelado-y-zoom`);
await btn('Ver todo el dibujo'); await page.waitForTimeout(400);
out.kAfterFitButton = await page.evaluate(() => CL.coloring.screen.view.k);
// Pellizco con dos dedos en el centro
const b = await board(); const cx = b.x + b.width * 0.35, cy = b.y + b.height * 0.35;
await multiStroke(page, [[[cx - 30, cy], [cx - 170, cy - 60]], [[cx + 30, cy], [cx + 170, cy + 60]]], { steps: 20 });
await page.waitForTimeout(400);
out.kPinch = await page.evaluate(() => CL.coloring.screen.view.k);
await shot(page, `colorear/touch-${size}-4-pellizco`);

// desplazar con dos dedos
await multiStroke(page, [[[cx - 60, cy], [cx + 60, cy + 80]], [[cx + 60, cy], [cx + 180, cy + 80]]], { steps: 16 });
await page.waitForTimeout(300);
// pintar con pincel zoomeado (trazo corto)
const sr = await page.evaluate(() => document.querySelector('.cl-stage').getBoundingClientRect().toJSON()); const px = sr.x + sr.width * 0.35, py = sr.y + sr.height * 0.45;
await multiStroke(page, [[[px, py], [px + 120, py + 20], [px + 60, py + 90]]], { steps: 20 });
await page.waitForTimeout(300);
await shot(page, `colorear/touch-${size}-5-pincel-con-zoom`);
out.histEnd = (await page.evaluate(() => CL.coloring.screen.painter.historyLength)) - hist0;
out.events = await page.evaluate(() => window.__ev); out.errors = t.errors;
console.log(JSON.stringify(out));
await t.close();
