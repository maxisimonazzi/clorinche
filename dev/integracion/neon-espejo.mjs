// Neón con caleidoscopio: captura en medio del trazo (dos dedos, arcoíris, 6 y 8 ejes) y fps.
import { launch, appUrl, shot, multiStroke } from '../lib.mjs';

const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
const W = t.size.width, H = t.size.height;
await page.goto(appUrl('neon'));
await page.waitForTimeout(1000);
for (const ejes of ['6', '8']) {
  await page.locator('[aria-label="Arcoíris"]').first().click();
  await page.locator('[aria-label="Caleidoscopio de ' + ejes + '"]').first().click();
  await page.waitForTimeout(300);
  const a = [], b = [];
  for (let i = 0; i <= 10; i++) {
    a.push([W * (0.52 + 0.12 * Math.cos(i / 3)), H * (0.3 + 0.03 * i)]);
    b.push([W * (0.6 + 0.02 * i), H * (0.55 + 0.1 * Math.sin(i / 2))]);
  }
  const fps = page.evaluate(async () => {
    let n = 0; const t0 = performance.now();
    await new Promise((r) => { const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); });
    return Math.round(n / ((performance.now() - t0) / 1000));
  });
  await multiStroke(page, [a, b], { steps: 40, delay: 16, release: false });
  await shot(page, `integracion/neon-${size}-caleido-${ejes}-en-medio`);
  await multiStroke(page, [[a[10], [a[10][0] + 30, a[10][1] + 30]], [b[10], [b[10][0] - 30, b[10][1]]]], { steps: 3, delay: 10 });
  console.log(ejes, 'ejes · fps durante el trazo:', await fps);
}
console.log('errores:', t.errors.length ? t.errors : 'ninguno');
await t.close();
