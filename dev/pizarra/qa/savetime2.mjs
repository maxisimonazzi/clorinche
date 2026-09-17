import { open, board, wave, stroke } from './h.mjs';
for (const size of ['tablet', 'desktop']) {
  const t = await open(size);
  const { page } = t;
  const b = await board(page);
  await page.evaluate(() => { CL.pizarra.current._test.selectTool('crayon'); CL.pizarra.current._test.selectSize(3); });
  for (const y of [0.2, 0.4, 0.6, 0.8]) await stroke(page, wave(b, y), { pointer: t.size.touch ? 'touch' : 'mouse', steps: 20 });
  await page.waitForTimeout(3000);
  const ms = await page.evaluate(async () => {
    const L = CL.pizarra.current._test.layer;
    const U = CL.util;
    const out = {};
    let t0 = performance.now(); const blob = await U.canvasToBlob(L, 'image/png'); out.layerBlob = Math.round(performance.now() - t0);
    const c2 = document.createElement('canvas'); c2.width = L.width; c2.height = L.height; c2.getContext('2d').drawImage(L, 0, 0);
    t0 = performance.now(); await U.canvasToBlob(c2, 'image/png'); out.copyBlob = Math.round(performance.now() - t0);
    t0 = performance.now(); L.toDataURL(); out.dataUrlSync = Math.round(performance.now() - t0);
    const th = U.canvas(480, 400); th.getContext('2d').drawImage(L, 0, 0, 480, 400);
    t0 = performance.now(); await U.canvasToBlob(th, 'image/png'); out.thumbBlob = Math.round(performance.now() - t0);
    t0 = performance.now(); await CL.db.kv.set('x', blob); out.idb = Math.round(performance.now() - t0);
    t0 = performance.now(); await new Promise((r) => setTimeout(r, 0)); out.timeout0 = Math.round(performance.now() - t0);
    return out;
  });
  console.log(size, JSON.stringify(ms));
  await t.close();
}
