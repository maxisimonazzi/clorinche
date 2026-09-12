// Corrección 1 — sombras de la tira de categorías (recorte ampliado) y brillitos en el fondo entero
// (azulejo que se repite: que no se note la repetición ni haya costuras).
import { launch, appUrl, shot } from '../lib.mjs';
import { ready, P, hit, filterErrors } from '../review-colorear/common.mjs';
for (const size of ['desktop', 'tabletV', 'phone']) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('dibujos/selva'));
  await page.waitForSelector('.dj-item');
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => document.querySelector('.dj-strip').getBoundingClientRect().toJSON());
  await shot(page, `colorear/c1-strip-${size}`, { clip: { x: r.x, y: Math.max(0, r.y), width: Math.min(r.width, 520), height: r.height + 24 } });
  if (size === 'desktop') {
    await page.evaluate(() => CL.router.go('colorear/ballena'));
    await ready(page);
    await page.evaluate(() => { document.querySelector('.cl-sw[data-color="#2d68e0"]').click(); document.querySelector('.cl-sp[data-kind="sparkle"]').click(); });
    const [x, y] = await P(page, 0.02, 0.02);
    await hit(t, x, y);
    await page.waitForTimeout(600);
    await page.evaluate(() => { document.querySelector('.cl-sw[data-color="#ffd52e"]').click(); document.querySelector('.cl-sp[data-kind="sparkle"]').click(); });
    const [x2, y2] = await P(page, 0.5, 0.5);
    await hit(t, x2, y2);
    await page.waitForTimeout(600);
    await shot(page, 'colorear/c1-brillitos-fondo-desktop');
  }
  console.log(size, JSON.stringify(filterErrors(t.errors)));
  await t.close();
}
