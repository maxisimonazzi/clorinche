// Todos los sellos en cada color, sobre blanco y sobre pizarrón negro (con halo).
import { launch, appUrl, saveDataUrl, SHOTS } from '../lib.mjs';
import path from 'node:path';
const t = await launch({ size: 'desktop' });
await t.page.goto(appUrl('inicio'));
await t.page.waitForFunction(() => window.CL && CL.stamps && CL.pizarra);
const url = await t.page.evaluate(() => {
  const cols = CL.pizarra.COLORS.map((c) => c.c);
  const list = CL.stamps.list;
  const cell = 70;
  const c = document.createElement('canvas');
  c.width = cell * list.length + 20; c.height = cell * cols.length * 2 + 20;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height / 2);
  CL.pizarra.paintBackground(x, 'pizarron-negro', c.width, c.height); 
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height / 2);
  cols.forEach((col, j) => list.forEach((s, i) => {
    CL.stamps.draw(x, s.id, 10 + cell * i + cell / 2, 10 + cell * j + cell / 2, cell * 0.9, 0, col);
    CL.stamps.draw(x, s.id, 10 + cell * i + cell / 2, c.height / 2 + cell * j + cell / 2, cell * 0.9, 0, col, { halo: true });
  }));
  return c.toDataURL();
});
saveDataUrl(url, path.join(SHOTS, 'pizarra', 'stamps-colors.png'));
const big = await t.page.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 520;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 1200, 260);
  CL.pizarra.paintBackground(x, 'pizarron-verde', 1200, 520); x.fillStyle = '#fff'; x.fillRect(0, 0, 1200, 260);
  const ids = ['ballena', 'sol', 'estrella', 'vaquita', 'gato', 'dino'];
  ids.forEach((id, i) => {
    CL.stamps.draw(x, id, 100 + i * 200, 70, 120, 0, 'multi');
    CL.stamps.draw(x, id, 100 + i * 200, 190, 120, 0, '#23202b');
    CL.stamps.draw(x, id, 100 + i * 200, 330, 120, 0.2, 'multi', { halo: true });
    CL.stamps.draw(x, id, 100 + i * 200, 450, 120, 0, '#23202b', { halo: true });
  });
  return c.toDataURL();
});
saveDataUrl(big, path.join(SHOTS, 'pizarra', 'stamps-new.png'));
console.log(JSON.stringify({ n: await t.page.evaluate(() => CL.stamps.list.length), errors: t.errors }));
await t.close();
