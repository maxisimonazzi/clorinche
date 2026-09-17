// Pincel: lento (grueso) y rápido (fino), en varios colores y grosores, con zoom de las pelitos.
import { launch, appUrl, shot, stroke } from '../lib.mjs';
import { ready, board, at, T, resetDb, zoom } from './common.mjs';
const t = await launch({ size: 'tablet' });
const { page } = t;
await page.goto(appUrl('pizarra'));
await ready(page); await resetDb(page); await page.reload(); await ready(page);
const api = T(page);
const b = await board(page);
await api.tool('pincel');
const rows = [['#2f5bea', 3], ['#ff3b30', 2], ['#1fb35a', 1], ['#ffd60a', 0], ['#8b4dff', 3]];
for (let i = 0; i < rows.length; i++) {
  const [c, sz] = rows[i];
  await api.color(c); await api.size(sz);
  const y = 0.12 + i * 0.18;
  // lento con curva
  await stroke(page, [at(b, 0.05, y), at(b, 0.18, y - 0.06), at(b, 0.32, y + 0.05), at(b, 0.45, y)], { pointer: 'touch', steps: 60, delay: 22 });
  // rápido
  await stroke(page, [at(b, 0.52, y + 0.04), at(b, 0.7, y - 0.05), at(b, 0.95, y + 0.03)], { pointer: 'touch', steps: 8, delay: 10 });
}
await page.waitForTimeout(300);
await shot(page, 'pizarra/pincel', { clip: b });
await zoom(page, 'pincel-zoom', 0.02, 0.02, 0.3, 0.2, 2);
console.log(JSON.stringify(t.errors));
await t.close();
