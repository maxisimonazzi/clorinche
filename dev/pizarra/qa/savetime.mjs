// Cuánto tarda un guardado (codificar PNG de la capa + miniatura + IndexedDB) en cada tamaño.
import { open, board, wave, stroke } from './h.mjs';
for (const size of ['tablet', 'phone', 'desktop', 'desktopHD']) {
  const t = await open(size);
  const { page } = t;
  const b = await board(page);
  await page.evaluate(() => { CL.pizarra.current._test.selectTool('crayon'); CL.pizarra.current._test.selectSize(3); });
  for (const y of [0.2, 0.4, 0.6, 0.8]) await stroke(page, wave(b, y), { pointer: t.size.touch ? 'touch' : 'mouse', steps: 20 });
  await page.waitForTimeout(2000);
  const ms = await page.evaluate(async () => {
    const r = [];
    for (let i = 0; i < 3; i++) { const t0 = performance.now(); await CL.pizarra.current.save(); r.push(Math.round(performance.now() - t0)); }
    const w = CL.pizarra.current.work;
    return { r, paintKB: Math.round(w.paint.size / 1024), thumbKB: Math.round(w.thumb.size / 1024), px: w.w + 'x' + w.h };
  });
  console.log(size, JSON.stringify(ms), t.errors);
  await t.close();
}
