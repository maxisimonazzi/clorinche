// Hoja de sellos: cada sello en su color propio, en un color elegido y en blanco, a buen tamaño.
import { launch, appUrl, saveDataUrl, SHOTS } from '../lib.mjs';
import path from 'node:path';

const t = await launch({ size: 'desktop' });
const { page } = t;
await page.goto(appUrl('inicio'));
await page.waitForTimeout(400);
const url = await page.evaluate(() => {
  const list = CL.stamps.list;
  const cell = 150, cols = list.length;
  const colors = ['multi', '#2f5bea', '#ff3b30', '#ffffff', '#1fb35a'];
  const c = CL.util.canvas(cols * cell, colors.length * cell);
  const x = c.getContext('2d');
  x.fillStyle = '#f4f0e6'; x.fillRect(0, 0, c.width, c.height);
  colors.forEach((col, r) => {
    list.forEach((s, i) => CL.stamps.draw(x, s.id, i * cell + cell / 2, r * cell + cell / 2, cell * 0.85, 0, col));
  });
  return c.toDataURL();
});
saveDataUrl(url, path.join(SHOTS, 'pizarra', 'stamps-sheet.png'));
console.log(JSON.stringify(t.errors));
await t.close();
