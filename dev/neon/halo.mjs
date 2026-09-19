// Neón: zoom del halo y centro blanco con cada grosor; perfil de brillo.
import { launch, appUrl, shot, stroke, rect } from '../lib.mjs';
import { zoomShot, profile } from './zoom.mjs';

const t = await launch({ size: 'tablet' });
const { page } = t;
await page.goto(appUrl('neon'));
await page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
const r = await rect(page, '.neon-stage');
for (let s = 0; s < 4; s++) {
  await page.locator('.neon-size').nth(s).click();
  const y = r.y + r.height * (0.2 + s * 0.2);
  await stroke(page, [[r.x + 60, y], [r.x + r.width * 0.45, y], [r.x + r.width * 0.6, y - 40], [r.x + r.width - 60, y + 30]], { steps: 50 });
}
// Cruce de dos trazos (se suma el brillo)
await page.locator('.neon-swatch').nth(1).click();
await stroke(page, [[r.x + r.width * 0.3, r.y + 30], [r.x + r.width * 0.3, r.y + r.height - 30]], { steps: 40 });
await page.waitForTimeout(200);
await shot(page, 'neon/halo-tablet');
await zoomShot(page, 'neon/halo-zoom-s1', { x: r.x + r.width * 0.25, y: r.y + r.height * 0.4 - 50, width: 150, height: 100 }, 3);
await zoomShot(page, 'neon/halo-zoom-s3', { x: r.x + 90, y: r.y + r.height * 0.8 - 60, width: 150, height: 120 }, 3);
const prof = await profile(page, r.x + 120, r.y + r.height * 0.4 - 45, r.y + r.height * 0.4 + 45);
console.log(prof.map((p, i) => i + ':' + p.join(',')).join('  '));
console.log('errors', t.errors);
await t.close();
