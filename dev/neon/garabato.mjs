// Neón: garabato denso (como hace un chico) con y sin caleidoscopio: ¿se vuelve un manchón blanco?
import { launch, appUrl, shot, multiStroke, rect } from '../lib.mjs';

const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
await page.goto(appUrl('neon'));
await page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
const r = await rect(page, '.neon-stage');
const X = (f) => r.x + r.width * f, Y = (f) => r.y + r.height * f;
const zig = (x0, y0, w, h, n) => { const p = []; for (let i = 0; i <= n; i++) p.push([X(x0 + (i % 2 ? w : 0) + Math.random() * 0.02), Y(y0 + (h * i) / n)]); return p; };
for (const [mi, col, sz, name] of [[0, 0, 2, 'solo'], [4, 1, 1, 'k8']]) {
  await page.locator('.neon-mirror').nth(mi).click();
  await page.locator('.neon-swatch').nth(col).click();
  await page.locator('.neon-size').nth(sz).click();
  const x0 = name === 'solo' ? 0.2 : 0.56;
  await multiStroke(page, [zig(x0, 0.15, 0.22, 0.3, 24)], { steps: 120, delay: 3 });
  await multiStroke(page, [zig(x0 + 0.02, 0.2, 0.18, 0.25, 30)], { steps: 120, delay: 3 });
  await multiStroke(page, [zig(x0, 0.18, 0.2, 0.28, 20)], { steps: 120, delay: 3 });
}
await page.waitForTimeout(200);
await shot(page, `neon/garabato-${size}`);
console.log('errors', t.errors);
await t.close();
