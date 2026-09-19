// Revisión neón: 9 colores x 4 grosores, captura durante (sin soltar) y zoom 1:1 de los píxeles
// para ver halo difuso + centro casi blanco, cuentas en las uniones y nitidez con dpr.
import { launch, appUrl, shot, multiStroke, touches, rect } from '../lib.mjs';

for (const size of process.argv.slice(2).length ? process.argv.slice(2) : ['phone', 'tablet']) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('neon'));
  await page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
  const r = await rect(page, '.neon-stage');
  const X = (f) => r.x + r.width * f, Y = (f) => r.y + r.height * f;
  await page.locator('.neon-mirror').nth(0).click();
  // Grosores: 4 ondas lentas con pocos puntos (uniones marcadas) en rosa.
  await page.locator('.neon-swatch').nth(0).click();
  for (let s = 0; s < 4; s++) {
    await page.locator('.neon-size').nth(s).click();
    const p = [];
    for (let i = 0; i <= 8; i++) p.push([X(0.08 + 0.84 * i / 8), Y(0.1 + s * 0.1) + (i % 2 ? 12 : -12)]);
    await multiStroke(page, [p], { steps: 8, delay: 20 });
  }
  // Colores: 9 trazos cortos en grosor mediano, el último sin soltar.
  await page.locator('.neon-size').nth(1).click();
  for (let c = 0; c < 9; c++) {
    await page.locator('.neon-swatch').nth(c).click();
    const x = 0.08 + c * 0.1;
    const path = [[X(x), Y(0.55)], [X(x + 0.05), Y(0.7)], [X(x), Y(0.85)]];
    await multiStroke(page, [path], { steps: 20, delay: 5, release: c < 8 });
  }
  await shot(page, `neon/rev/halo/${size}-durante`);
  await touches(page, []);
  await page.waitForTimeout(150);
  await shot(page, `neon/rev/halo/${size}-despues`);
  // Zoom de un tramo grueso con uniones (a resolución nativa de la pantalla).
  await shot(page, `neon/rev/halo/${size}-zoom-grosores`, { clip: { x: X(0.3), y: Y(0.05), width: Math.min(160, r.width * 0.4), height: r.height * 0.4 } });
  await shot(page, `neon/rev/halo/${size}-zoom-colores`, { clip: { x: X(0.05), y: Y(0.52), width: r.width * 0.5, height: r.height * 0.36 } });
  console.log(size, 'errors', JSON.stringify(t.errors));
  await t.close();
}
