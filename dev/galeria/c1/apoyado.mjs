// Revisión (rv): un dedo (o la palma) apoyado en el fondo mientras otro dedo toca una tarjeta / una obra.
// Uso: cd dev && node review-galeria/rv-apoyado.mjs [tamaño=tablet]
import { launch, appUrl } from '../../lib.mjs';
import { ok, clean, center, seedSynthetic, state, lift, tStart, tEnd } from './r1-lib.mjs';

const size = process.argv[2] || 'tablet';
const t = await launch({ size });
const { page } = t;
const hash = () => page.evaluate(() => decodeURIComponent(location.hash));
await page.goto(appUrl('inicio'));
await page.waitForTimeout(900);
await seedSynthetic(page, { done: 4, progress: 0 });
const vp = page.viewportSize();
// Palma apoyada abajo a la izquierda (fuera de las tarjetas) y toque en "Colorear".
{
  const [x, y] = await center(page, '.home-card--colorear');
  await tStart(page, [{ x: 4, y: vp.height - 4, id: 1 }]);
  await page.waitForTimeout(200);
  await tStart(page, [{ x: 4, y: vp.height - 4, id: 1 }, { x, y, id: 2 }]);
  await page.waitForTimeout(80);
  await lift(page, [{ x, y, id: 2 }]); // suelta sólo el dedo que tocó
  await page.waitForTimeout(900);
  const h = await hash();
  await tEnd(page);
  await page.waitForTimeout(600);
  console.log('   inicio, palma apoyada + toque en Colorear →', h, '/ al soltar la palma →', await hash());
  ok(h === '#dibujos' || (await hash()) === '#dibujos', 'con la palma apoyada, tocar Colorear abre el catálogo');
}
// Galería: palma apoyada + toque en una obra
{
  await page.evaluate(() => CL.router.go('obras'));
  await page.waitForTimeout(1300);
  const [x, y] = await center(page, '.gal-card >> nth=0');
  await tStart(page, [{ x: 4, y: vp.height - 4, id: 1 }]);
  await page.waitForTimeout(200);
  await tStart(page, [{ x: 4, y: vp.height - 4, id: 1 }, { x, y, id: 2 }]);
  await page.waitForTimeout(80);
  await lift(page, [{ x, y, id: 2 }]); // suelta sólo el dedo que tocó
  await page.waitForTimeout(900);
  const s = await state(page);
  await tEnd(page);
  await page.waitForTimeout(600);
  console.log('   galería, palma apoyada + toque en obra → vistas:', s.modal, '/ después de soltar:', (await state(page)).modal);
  ok(s.modal === 1 || (await state(page)).modal === 1, 'con la palma apoyada, tocar una obra la abre');
}
ok(clean(t.errors).length === 0, 'sin errores ' + JSON.stringify(clean(t.errors)).slice(0, 600));
await t.close();
