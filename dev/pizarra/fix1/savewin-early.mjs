// QA pizarra: ventana de pérdida al recargar justo después de un trazo; tiempo de guardado; diferencias de píxeles.
import { open, board, wave, stroke, ready } from './h.mjs';

const size = process.argv[2] || 'tablet';
const t = await open(size);
const { page } = t;
const ptr = t.size.touch ? 'touch' : 'mouse';
const snap = () => page.evaluate(() => {
  const c = CL.pizarra.current._test.layer;
  window.__snap = c.getContext('2d').getImageData(0, 0, c.width, c.height).data.slice();
  let n = 0; for (let i = 3; i < window.__snap.length; i += 4) if (window.__snap[i]) n++;
  return n;
});
const count = () => page.evaluate(() => {
  const c = CL.pizarra.current._test.layer;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
  return n;
});
const out = { size, reload: [] };
// medir cuánto tarda el guardado (desde el fin del trazo hasta que works.save resuelve)
await page.evaluate(() => {
  const o = CL.db.works.save;
  window.__saves = [];
  CL.db.works.save = async (w) => { const t0 = performance.now(); const r = await o(w); window.__saves.push({ at: performance.now(), dur: Math.round(performance.now() - t0) }); return r; };
});
let b = await board(page);
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('fibra'); T.selectColor('#ff3b30'); T.selectSize(3); });
const tEnd = await page.evaluate(() => performance.now());
await stroke(page, wave(b, 0.3), { pointer: ptr, steps: 12 });
const t1 = await page.evaluate(() => performance.now());
await page.waitForTimeout(2500);
out.saveTimes = await page.evaluate((t1) => window.__saves.map((s) => ({ afterStrokeMs: Math.round(s.at - t1), idbMs: s.dur })), t1);

for (const ms of [0, 150, 250, 350]) {
  b = await board(page);
  const before = await count();
  await stroke(page, wave(b, 0.3 + ms / 4000), { pointer: ptr, steps: 12 });
  const drawn = await count();
  await page.waitForTimeout(ms);
  await page.reload();
  await ready(page);
  const after = await count();
  out.reload.push({ waitMs: ms, before, drawn, after, lost: after < drawn });
}

// pixel diff tras ir a inicio y volver (¿el PNG altera colores semitransparentes?)
b = await board(page);
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('arcoiris'); T.selectSize(3); });
await stroke(page, wave(b, 0.85), { pointer: ptr, steps: 16 });
await page.waitForTimeout(1500);
await snap();
await page.evaluate(() => CL.router.go('inicio'));
await page.waitForTimeout(800);
await page.evaluate(() => CL.router.go('pizarra'));
await ready(page);
out.diff = await page.evaluate(() => {
  const c = CL.pizarra.current._test.layer;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const s = window.__snap;
  let n = 0, max = 0, alphaChanged = 0;
  for (let i = 0; i < d.length; i++) { const k = Math.abs(d[i] - s[i]); if (k) { n++; if (k > max) max = k; if (i % 4 === 3) alphaChanged++; } }
  return { changedChannels: n, maxDelta: max, alphaChanged, sameSize: d.length === s.length };
});
out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
