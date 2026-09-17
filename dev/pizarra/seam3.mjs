// Registra los eventos de puntero durante 3 dedos a la vez para ver si algún trazo se corta.
import { launch, appUrl, multiStroke, tap } from '../lib.mjs';
import { ready, board, wave, T, resetDb } from './common.mjs';
const t = await launch({ size: 'tablet' });
const { page } = t;
await page.goto(appUrl('pizarra'));
await ready(page); await resetDb(page); await page.reload(); await ready(page);
const api = T(page);
await page.evaluate(() => {
  window.__ev = [];
  const st = document.querySelector('.pz-stage');
  for (const n of ['pointerdown', 'pointerup', 'pointercancel', 'lostpointercapture']) st.addEventListener(n, (e) => window.__ev.push(n + ':' + e.pointerId), true);
});
const b = await board(page);
let bad = 0;
for (let k = 0; k < 12; k++) {
  await api.tool('crayon');
  await page.evaluate(() => { window.__ev = []; });
  await multiStroke(page, [wave(b, 0.25, 0.08, 0.9, 0.06), wave(b, 0.45, 0.1, 0.92, -0.06), wave(b, 0.65, 0.06, 0.88, 0.05)], { steps: 30, delay: 12 });
  await page.waitForTimeout(100);
  const ev = await page.evaluate(() => window.__ev);
  const downs = ev.filter((e) => e.startsWith('pointerdown')).length;
  if (downs !== 3) { bad++; console.log(k, ev.join(' ')); }
}
console.log('bad', bad, JSON.stringify(t.errors));
await t.close();
