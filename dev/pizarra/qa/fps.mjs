// Fluidez dibujando: fps y cuadros largos con 3 dedos, por herramienta, en el grosor máximo.
import { open, board, wave, multiStroke, stroke } from './h.mjs';

const size = process.argv[2] || 'tablet';
const t = await open(size);
const { page } = t;
const b = await board(page);
const res = {};
for (const tool of ['lapiz', 'crayon', 'pincel', 'aerosol', 'brillitos', 'sellos', 'arcoiris', 'goma']) {
  await page.evaluate((tool) => { const c = CL.pizarra.current._test; c.selectTool(tool); c.selectSize(3); c.selectColor('multi'); if (tool === 'goma') c.selectTool('goma'); }, tool);
  await page.evaluate(() => {
    window.__ft = []; window.__run = true; let last = performance.now();
    const f = (now) => { window.__ft.push(now - last); last = now; if (window.__run) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  const t0 = Date.now();
  while (Date.now() - t0 < 2500) {
    const y = 0.15 + Math.random() * 0.2;
    if (t.size.touch) await multiStroke(page, [wave(b, y, 0.05, 0.95, 0.08, 12), wave(b, y + 0.3, 0.95, 0.05, 0.08, 12), wave(b, y + 0.55, 0.05, 0.95, -0.08, 12)], { steps: 30, delay: 12 });
    else await stroke(page, wave(b, y + 0.3, 0.05, 0.95, 0.08, 12), { steps: 30, delay: 12 });
  }
  const r = await page.evaluate(() => {
    window.__run = false;
    const ft = window.__ft.slice(2).sort((a, b) => a - b);
    const sum = ft.reduce((a, b) => a + b, 0);
    return { fps: Math.round((ft.length * 1000) / sum), p95: Math.round(ft[Math.floor(ft.length * 0.95)]), max: Math.round(ft[ft.length - 1]), long: ft.filter((x) => x > 50).length };
  });
  res[tool] = r;
  await page.evaluate(() => CL.pizarra.current._test.wipe());
  await page.waitForTimeout(1300);
}
console.log(size, JSON.stringify(res), t.errors);
await t.close();
