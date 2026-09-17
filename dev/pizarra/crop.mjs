// Recorta y amplía una captura: node pizarra/crop.mjs <png> x y w h k <salida>
import { launch, fileUrl, saveDataUrl } from '../lib.mjs';
const [f, x, y, w, h, k, out] = process.argv.slice(2);
const t = await launch({ size: 'desktop' });
await t.page.goto(fileUrl(f));
const url = await t.page.evaluate(([x, y, w, h, k]) => {
  const img = document.querySelector('img');
  const c = document.createElement('canvas'); c.width = w * k; c.height = h * k;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(img, x, y, w, h, 0, 0, w * k, h * k);
  return c.toDataURL();
}, [+x, +y, +w, +h, +k]);
saveDataUrl(url, out);
await t.close();
