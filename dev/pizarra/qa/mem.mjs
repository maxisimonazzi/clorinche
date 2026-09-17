// Memoria de lienzos: cuántos lienzos de tamaño completo quedan vivos tras 5 dedos con crayón y varios pasos de deshacer.
import { open, board, wave, multiStroke } from './h.mjs';
import { SIZES } from '../../lib.mjs';
const size = process.argv[2] || 'tablet';
const t = await open(size);
const { page } = t;
const b = await board(page);
await page.evaluate(() => { const c = CL.pizarra.current._test; c.selectTool('crayon'); c.selectSize(3); });
for (let k = 0; k < 6; k++) {
  await multiStroke(page, [0.1, 0.3, 0.5, 0.7, 0.9].map((y) => wave(b, y, 0.05, 0.95, 0.04)), { steps: 16, delay: 8 });
  await page.waitForTimeout(150);
}
const r = await page.evaluate(() => {
  const d = CL.pizarra.current.doc;
  const full = d.pw * d.ph * 4 / 1048576;
  const live = document.querySelectorAll('.pz-live').length;
  return { doc: d, MBperCanvas: +full.toFixed(1), liveInDom: live, undo: CL.pizarra.current._test.undoCount,
    estimateMB: Math.round(full * (4 + live * 2)) + ' (fondo, capa, fx, pre + ' + live + ' en vivo + ' + live + ' de forma) + deshacer (hasta 4 lienzos: ' + Math.round(full * 4) + ')' };
});
console.log(size, JSON.stringify(r));
// iPad Pro 12,9"
await page.setViewportSize({ width: 1366, height: 1024 });
await t.close();
const t2 = await open({ width: 1366, height: 1024, dpr: 2, touch: true });
const r2 = await t2.page.evaluate(() => { const d = CL.pizarra.current.doc; return { doc: d, MBperCanvas: +(d.pw * d.ph * 4 / 1048576).toFixed(1) }; });
console.log('ipadpro', JSON.stringify(r2));
await t2.close();
