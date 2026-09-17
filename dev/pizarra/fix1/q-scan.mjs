// QA pizarra: barrido de tamaños para encontrar desde dónhasta dónde hay controles cortados.
import { launch, appUrl } from '../../lib.mjs';
import { ready, controls, S } from './h.mjs';

const t = await launch({ size: { width: 1366, height: 768, dpr: 1, touch: false } });
const { page } = t;
await page.goto(appUrl('pizarra'));
await ready(page);
const cases = [];
for (const h of [720, 700, 680, 657, 640, 620, 600]) cases.push([1366, h]);
for (const h of [700, 657, 600]) cases.push([1024, h]);
for (const w of [540, 560, 580, 600, 620, 640, 660, 700, 740]) cases.push([w, 1000]);
for (const [w, h] of cases) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(350);
  const c = await controls(page);
  const scroll = await page.evaluate(() => { const p = document.querySelector('.pz-panel'); return p.scrollHeight - p.clientHeight; });
  console.log(`${w}x${h}`, JSON.stringify({ bad: c.bad.slice(0, 8), nBad: c.bad.length, panelScrollY: scroll, board: [c.board.w, c.board.h] }));
  if (w === 1366 && h === 657) await S(page, 'q/sizes/laptop1366x657');
  if (w === 660 && h === 1000) await S(page, 'q/sizes/portrait660x1000');
}
await t.close();
