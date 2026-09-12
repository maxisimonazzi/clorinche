// Fluidez: cuadros por segundo durante un trazo largo, la animación del balde y un pellizco.
import { launch, appUrl, stroke, multiStroke } from '../lib.mjs';
for (const size of ['desktop', 'tablet']) {
  const t = await launch({ size });
  const { page } = t;
  await page.goto(appUrl('colorear/elefante'));
  await page.waitForFunction(() => document.querySelectorAll('.screen').length === 1 && document.querySelector('.cl-ready'), null, { timeout: 10000 });
  await page.waitForTimeout(400);
  const b = await page.evaluate(() => document.querySelector('.cl-board').getBoundingClientRect().toJSON());
  const startCount = () => page.evaluate(() => { window.__f = 0; window.__t0 = performance.now(); window.__run = true; const f = () => { if (!window.__run) return; window.__f++; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const stopCount = () => page.evaluate(() => { window.__run = false; return Math.round(window.__f * 1000 / (performance.now() - window.__t0)); });
  const out = { size };
  // balde (animación de 250 ms) x4
  await startCount();
  for (const [fx, fy] of [[0.05, 0.05], [0.5, 0.35], [0.3, 0.7], [0.7, 0.7]]) { await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy); await page.waitForTimeout(300); }
  out.fpsBalde = await stopCount();
  await page.click('[aria-label="Pincel"]');
  const pts = []; for (let i = 0; i <= 12; i++) pts.push([b.x + b.width * (0.1 + 0.8 * (i % 2)), b.y + b.height * (0.1 + i * 0.065)]);
  await startCount();
  await stroke(page, pts, { steps: 160, delay: 6 });
  out.fpsPincel = await stopCount();
  await page.click('[aria-label="No salirse de las líneas"]');
  await startCount();
  await stroke(page, pts, { steps: 160, delay: 6 });
  out.fpsPincelLibre = await stopCount();
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  await startCount();
  await multiStroke(page, [[[cx - 20, cy], [cx - 200, cy]], [[cx + 20, cy], [cx + 200, cy]]], { steps: 60, delay: 8 });
  out.fpsPellizco = await stopCount();
  out.errors = t.errors;
  console.log(JSON.stringify(out));
  await t.close();
}
