// (corrección 1) Cuánto tarda en JS abrir el selector de color y qué parte es del mapa.
import { launch, appUrl, ready } from './common.mjs';
const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
await page.goto(appUrl('colorear/jirafa')); await ready(page); await page.waitForTimeout(600);
if (process.argv[3] === 'warm') await page.evaluate(() => { CL.sound.play('open'); CL.icon('check'); });
await page.waitForTimeout(300);
const r = [];
for (let i = 0; i < 3; i++) {
  r.push(await page.evaluate(async () => {
    const t0 = performance.now();
    document.querySelector('.cl-pick').click();
    const t1 = performance.now();
    await new Promise((res) => requestAnimationFrame(() => setTimeout(res, 0)));
    const t2 = performance.now();
    const c = document.querySelector('.cl-pk-map');
    const x = c.getContext('2d');
    const t3 = performance.now();
    const px = x.getImageData(c.width / 2, c.height / 2, 1, 1).data;
    const t4 = performance.now();
    return { click: Math.round(t1 - t0), toFrame: Math.round(t2 - t1), readback: Math.round(t4 - t3), px: Array.from(px) };
  }));
  await page.click('[aria-label="Listo"]'); await page.waitForTimeout(400);
}
console.log(size, JSON.stringify(r), JSON.stringify(t.errors));
await t.close();

