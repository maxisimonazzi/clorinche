// Junta varias imágenes PNG (de shots/mar/dev) en una grilla para compararlas de un vistazo.
//   node mar/montaje.mjs salida.png a.png b.png c.png ... [--cols 2] [--w 700]
import fs from 'node:fs';
import path from 'node:path';
import { launch, saveDataUrl, SHOTS } from '../lib.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? Number(args.splice(i, 2)[1]) : d; };
const cols = opt('--cols', 2), w = opt('--w', 700);
const [salida, ...imgs] = args;
const dir = path.join(SHOTS, 'mar', 'dev');
const datos = imgs.map((f) => 'data:image/png;base64,' + fs.readFileSync(path.join(dir, f)).toString('base64'));
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
const png = await t.page.evaluate(async ({ datos, cols, w }) => {
  const ims = await Promise.all(datos.map((src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; })));
  const h = Math.max(...ims.map((i) => (i.height * w) / i.width));
  const rows = Math.ceil(ims.length / cols), pad = 12;
  const c = document.createElement('canvas');
  c.width = cols * (w + pad) + pad; c.height = rows * (h + pad) + pad;
  const x = c.getContext('2d');
  x.fillStyle = '#888'; x.fillRect(0, 0, c.width, c.height);
  ims.forEach((im, k) => x.drawImage(im, pad + (k % cols) * (w + pad), pad + Math.floor(k / cols) * (h + pad), w, (im.height * w) / im.width));
  return c.toDataURL('image/png');
}, { datos, cols, w });
console.log(saveDataUrl(png, path.join(dir, salida)));
await t.close();
