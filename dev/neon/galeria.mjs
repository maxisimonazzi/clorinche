// Neón: la obra terminada aparece en la galería con su miniatura oscura.
import { launch, appUrl, shot, stroke, rect } from '../lib.mjs';
const t = await launch({ size: 'tablet' });
const { page } = t;
await page.goto(appUrl('neon'));
await page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
await page.locator('.neon-mirror').nth(4).click();
await page.locator('.neon-swatch').nth(8).click();
const r = await rect(page, '.neon-stage');
await stroke(page, [[r.x + r.width * 0.5, r.y + r.height * 0.2], [r.x + r.width * 0.7, r.y + r.height * 0.4], [r.x + r.width * 0.55, r.y + r.height * 0.45]], { steps: 30 });
await page.locator('.neon-done').click();
await page.waitForFunction(() => location.hash.startsWith('#obras/'), null, { timeout: 8000 });
await page.waitForTimeout(1200);
await shot(page, 'neon/galeria-tablet');
console.log(await page.evaluate(() => location.hash), 'errors', t.errors);
await t.close();
