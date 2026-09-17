// QA pizarra: memoria de lienzos retenida tras una "palma" (10 dedos) con crayón (lienzo en vivo + lienzo de forma por dedo).
import { open, board, at } from './h.mjs';

const size = process.argv[2] || 'tablet';
const t = await open(size);
const { page } = t;
await page.evaluate(() => {
  window.__cv = [];
  const ce = document.createElement.bind(document);
  document.createElement = (tag, ...r) => { const e = ce(tag, ...r); if (String(tag).toLowerCase() === 'canvas') window.__cv.push(e); return e; };
});
const b = await board(page);
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('crayon'); T.selectSize(2); });
const cdp = await page.context().newCDPSession(page);
const pts = Array.from({ length: 10 }, (_, i) => { const [x, y] = at(b, 0.15 + (i % 5) * 0.16, 0.35 + Math.floor(i / 5) * 0.25); return { x, y, id: 30 + i }; });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts });
for (let k = 1; k < 6; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts.map((p) => ({ ...p, x: p.x + k * 4 })) }); await page.waitForTimeout(16); }
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(500);
const r = await page.evaluate(() => {
  const d = CL.pizarra.current.doc;
  const full = window.__cv.filter((c) => c.width === d.pw && c.height === d.ph);
  const boardCv = [...document.querySelectorAll('.pz-board canvas')];
  const all = new Set([...full, ...boardCv.filter((c) => c.width === d.pw)]);
  return { doc: d, newFullCanvasesDuringPalm: full.length, retainedFullCanvases: all.size + 0, MBperCanvas: +(d.pw * d.ph * 4 / 1e6).toFixed(1) };
});
r.totalMB_new = Math.round(r.newFullCanvasesDuringPalm * r.MBperCanvas);
r.boardCanvases = await page.evaluate(() => document.querySelectorAll('.pz-board canvas').length);
r.errors = t.errors;
console.log(JSON.stringify({ size, ...r }));
await t.close();
