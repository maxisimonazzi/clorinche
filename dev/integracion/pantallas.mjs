// Recorrido de capturas por pantalla y tamaño (integración final).
//   node integracion/pantallas.mjs [tamaños] [pantallas]
//   ej: node integracion/pantallas.mjs phone,desktop colorear,dibujos
import { launch, appUrl, shot, stroke, tap, multiStroke } from '../lib.mjs';

const sizes = (process.argv[2] || 'desktop,tablet,phone').split(',');
const only = process.argv[3] ? process.argv[3].split(',') : null;
const want = (n) => !only || only.includes(n);

for (const size of sizes) {
  const t = await launch({ size });
  const { page } = t;
  const W = t.size.width, H = t.size.height;
  const ptr = t.size.touch ? 'touch' : 'mouse';
  const P = (n) => `integracion/${size}/${n}`;
  const go = async (hash, ms = 900) => { await page.goto(appUrl(hash)); await page.waitForTimeout(ms); };

  if (want('inicio')) { await go('inicio'); await shot(page, P('inicio')); }
  if (want('dibujos')) {
    await go('dibujos', 1500); await shot(page, P('dibujos'));
    await go('dibujos/selva', 1200); await shot(page, P('dibujos-selva'));
  }
  if (want('colorear')) {
    await go('colorear/leon', 2200);
    const cv = await page.locator('.screen--colorear canvas').first().boundingBox();
    const sw = page.locator('.screen--colorear .cl-sw').filter({ visible: true });
    const n = await sw.count();
    const pts = [[0.5, 0.35], [0.5, 0.15], [0.3, 0.7], [0.7, 0.7], [0.05, 0.05], [0.5, 0.55], [0.42, 0.3], [0.62, 0.9]];
    for (let i = 0; i < pts.length; i++) {
      if (n) { await sw.nth((i * 5 + 2) % n).click(); await page.waitForTimeout(80); }
      await tap(page, cv.x + cv.width * pts[i][0], cv.y + cv.height * pts[i][1], { pointer: ptr });
      await page.waitForTimeout(350);
    }
    await shot(page, P('colorear-leon'));
    console.log(size, 'muestras de color visibles:', n);
  }
  if (want('subir')) { await go('subir'); await shot(page, P('subir')); }
  if (want('pizarra')) {
    await go('pizarra', 1200);
    const c = await page.locator('.screen--pizarra canvas').last().boundingBox();
    await multiStroke(page, [
      [[c.x + c.width * 0.2, c.y + c.height * 0.3], [c.x + c.width * 0.4, c.y + c.height * 0.7], [c.x + c.width * 0.6, c.y + c.height * 0.3]],
      [[c.x + c.width * 0.3, c.y + c.height * 0.8], [c.x + c.width * 0.8, c.y + c.height * 0.6]],
    ], { steps: 30, delay: 6 });
    await page.waitForTimeout(400);
    await shot(page, P('pizarra'));
  }
  if (want('neon')) {
    await go('neon', 1200);
    const c = { x: 0, y: 0, width: W, height: H };
    const a = [[W * 0.3, H * 0.4], [W * 0.45, H * 0.65], [W * 0.6, H * 0.35], [W * 0.7, H * 0.6]];
    await multiStroke(page, [a], { steps: 26, delay: 8, release: false });
    await page.waitForTimeout(150);
    await shot(page, P('neon-en-medio'));
    await multiStroke(page, [[[W * 0.72, H * 0.6], [W * 0.8, H * 0.7]]], { steps: 4, delay: 8 });
    await page.waitForTimeout(300);
    await shot(page, P('neon'));
  }
  if (want('fuegos')) { await go('fuegos'); await shot(page, P('fuegos')); }
  if (want('obras')) { await go('obras', 1200); await shot(page, P('obras')); }
  console.log(size, 'errores:', t.errors.length ? t.errors : 'ninguno');
  await t.close();
}
