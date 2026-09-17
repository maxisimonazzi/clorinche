// QA pizarra: traza de tiempos del autoguardado después de un trazo.
import { open, board, wave, stroke, ready } from './h.mjs';

const size = process.argv[2] || 'tablet';
const t = await open(size);
const { page } = t;
const ptr = t.size.touch ? 'touch' : 'mouse';
await page.evaluate(() => {
  window.__log = [];
  const T0 = () => Math.round(performance.now());
  const U = CL.util;
  const cb = U.canvasToBlob;
  U.canvasToBlob = async (c, ...a) => { window.__log.push(['toBlob start', c.width + 'x' + c.height, T0()]); const r = await cb(c, ...a); window.__log.push(['toBlob end', r.size, T0()]); return r; };
  const sv = CL.db.works.save;
  CL.db.works.save = async (w) => { window.__log.push(['save start', w.status, T0()]); const r = await sv(w); window.__log.push(['save end', r.id, T0()]); return r; };
  const dl = CL.db.works.del;
  CL.db.works.del = async (id) => { window.__log.push(['del', id, T0()]); return dl(id); };
});
const b = await board(page);
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('fibra'); T.selectColor('#ff3b30'); T.selectSize(3); });
for (let k = 0; k < 2; k++) {
  const t0 = await page.evaluate(() => Math.round(performance.now()));
  await stroke(page, wave(b, 0.3 + k * 0.3), { pointer: ptr, steps: 12 });
  const t1 = await page.evaluate(() => Math.round(performance.now()));
  await page.evaluate(() => window.__log.push(['stroke end', CL.pizarra.current._test.undoCount, Math.round(performance.now())]));
  await page.waitForTimeout(4000);
  console.log('stroke', k, { t0, t1 }, JSON.stringify(await page.evaluate(() => window.__log.splice(0))));
  console.log('info', JSON.stringify(await page.evaluate(() => ({ undo: CL.pizarra.current._test.undoCount, has: CL.pizarra.current._test.hasContent, work: CL.pizarra.current.work && CL.pizarra.current.work.id }))));
}
console.log(t.errors);
await t.close();
