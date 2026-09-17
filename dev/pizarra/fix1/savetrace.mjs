// Traza de tiempos del autoguardado: fin del trazo -> codificación -> IndexedDB.
import { open, board, wave, stroke } from './h.mjs';
const size = process.argv[2] || 'tablet';
const t = await open(size);
const { page } = t;
await page.evaluate(() => {
  window.__log = [];
  const L = (m) => window.__log.push([Math.round(performance.now()), m]);
  const oc = OffscreenCanvas.prototype.convertToBlob;
  OffscreenCanvas.prototype.convertToBlob = async function (...a) { L('convert start ' + this.width); const r = await oc.apply(this, a); L('convert end ' + this.width); return r; };
  const sv = CL.db.works.save;
  CL.db.works.save = async (w) => { L('idb start'); const r = await sv(w); L('idb end'); return r; };
  const up = (e) => L(e.type);
  document.addEventListener('pointerup', up, true);
});
const b = await board(page);
await stroke(page, wave(b, 0.3), { pointer: t.size.touch ? 'touch' : 'mouse', steps: 12 });
await page.waitForTimeout(2500);
console.log(JSON.stringify(await page.evaluate(() => window.__log)));
await t.close();
