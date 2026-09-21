// Revisión 1: "¡Terminé!" → #obras/<id> → "atrás" del celular: ¿qué ve el chico?
import { launch, appUrl, shot } from '../../lib.mjs';
import { clean } from './lib.mjs';
const t = await launch({ size: 'tablet' });
const { page } = t;
await page.goto(appUrl('inicio'));
await page.waitForTimeout(600);
await page.evaluate(() => CL.router.go('dibujos'));
await page.waitForTimeout(800);
await page.evaluate(() => CL.router.go('colorear/vaca'));
await page.waitForTimeout(2500);
const bb = await page.locator('.cl-board').boundingBox();
for (const [fx, fy] of [[0.5, 0.55], [0.35, 0.3], [0.62, 0.62]]) { await page.mouse.click(bb.x + bb.width * fx, bb.y + bb.height * fy); await page.waitForTimeout(150); }
await page.waitForTimeout(400);
await page.locator('.cl-done').click();
await page.waitForFunction(() => location.hash.startsWith('#obras/'), null, { timeout: 15000 });
await page.waitForTimeout(1200);
await page.evaluate(() => history.back());
await page.waitForTimeout(2500);
console.log('tras atrás:', await page.evaluate(() => ({ hash: location.hash, screen: document.body.dataset.screen })));
await shot(page, 'galeria/r2/termine-atras-tablet');
console.log(clean(t.errors));
await t.close();
