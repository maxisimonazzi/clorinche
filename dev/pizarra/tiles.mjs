// Mosaicos de textura repetidos 3×3 (para ver costuras) — lápiz y crayón a res 2.
import { launch, appUrl, saveDataUrl, SHOTS } from '../lib.mjs';
import path from 'node:path';
const t = await launch({ size: 'tablet' });
const { page } = t;
await page.goto(appUrl('inicio'));
await page.waitForTimeout(500);
for (const kind of ['cera', 'grano']) {
  const url = await page.evaluate((kind) => {
    const m = CL.brushes.textureMask(kind, 2);
    const c = CL.util.canvas(m.width * 2.5, m.height * 2.5);
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    const tile = CL.util.canvas(m.width, m.height);
    const tx = tile.getContext('2d'); tx.drawImage(m, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = '#e0302a'; tx.fillRect(0, 0, m.width, m.height);
    x.fillStyle = x.createPattern(tile, 'repeat'); x.fillRect(0, 0, c.width, c.height);
    return c.toDataURL();
  }, kind);
  saveDataUrl(url, path.join(SHOTS, 'pizarra', 'tile-' + kind + '.png'));
}
console.log(JSON.stringify(t.errors));
await t.close();
