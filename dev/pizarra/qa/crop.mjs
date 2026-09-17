// Recorta una imagen (x,y,w,h) y la amplía k veces: node review-pizarra/crop.mjs in.png out.png x y w h k
import { launch, saveDataUrl } from '../../lib.mjs';
import fs from 'node:fs';
const [inp, outp, x, y, w, h, k = 1] = process.argv.slice(2);
const t = await launch({ size: 'desktop' });
const data = 'data:image/png;base64,' + fs.readFileSync(inp).toString('base64');
const url = await t.page.evaluate(async ([d, x, y, w, h, k]) => {
  const img = new Image(); img.src = d; await img.decode();
  const c = document.createElement('canvas'); c.width = w * k; c.height = h * k;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = k < 1.5; g.drawImage(img, x, y, w, h, 0, 0, w * k, h * k);
  return c.toDataURL();
}, [data, +x, +y, +w, +h, +k]);
saveDataUrl(url, outp);
await t.close();
