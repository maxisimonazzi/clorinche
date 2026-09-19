// Revisión neón: garabato realista de chico (un dedo, grosor mediano/grueso, ida y vuelta varios segundos)
// con y sin caleidoscopio. ¿Se vuelve un manchón blanco? ¿Se sigue viendo lo nuevo encima?
import { launch, appUrl, shot, multiStroke, rect } from '../lib.mjs';

const size = process.argv[2] || 'tablet';
const cases = [
  { name: 'solo-mediano', mirror: 0, color: 0, sz: 1 },
  { name: 'k8-mediano', mirror: 4, color: 8, sz: 1 },
  { name: 'k8-grueso', mirror: 4, color: 1, sz: 2 },
  { name: 'k4-muygrueso', mirror: 2, color: 3, sz: 3 },
];
for (const c of cases) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('neon'));
  await page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
  const r = await rect(page, '.neon-stage');
  const X = (f) => r.x + r.width * f, Y = (f) => r.y + r.height * f;
  await page.locator('.neon-mirror').nth(c.mirror).click();
  await page.locator('.neon-swatch').nth(c.color).click();
  await page.locator('.neon-size').nth(c.sz).click();
  // Garabato: 3 trazos de ida y vuelta en una zona de ~25% x 30% (fuera del centro).
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 3; k++) {
    const p = [];
    for (let i = 0; i <= 14; i++) p.push([X(0.55 + (i % 2 ? 0.25 : 0) + rnd() * 0.04), Y(0.15 + 0.3 * rnd())]);
    await multiStroke(page, [p], { steps: 90, delay: 3 });
  }
  await page.waitForTimeout(150);
  await shot(page, `neon/rev/garabato/${size}-${c.name}-1`);
  // Un trazo nuevo de otro color encima del garabato: ¿se ve?
  await page.locator('.neon-swatch').nth(c.color === 2 ? 0 : 2).click();
  await multiStroke(page, [[[X(0.5), Y(0.3)], [X(0.9), Y(0.3)]]], { steps: 20 });
  await page.waitForTimeout(150);
  await shot(page, `neon/rev/garabato/${size}-${c.name}-2-encima`);
  // Fracción de píxeles casi blancos en la pizarra
  const frac = await page.evaluate(() => {
    const p = document.querySelector('.neon-paint');
    const g = p.getContext('2d');
    const d = g.getImageData(0, 0, p.width, p.height).data;
    let white = 0, ink = 0;
    for (let i = 0; i < d.length; i += 16) {
      if (d[i + 3] > 20) ink++;
      if (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235 && d[i + 3] > 235) white++;
    }
    return { blancoSobreTinta: +(white / Math.max(1, ink)).toFixed(2) };
  });
  console.log(size, c.name, JSON.stringify(frac), 'errors', JSON.stringify(t.errors));
  await t.close();
}
