// Recorte ampliado de una vista previa individual (dev/shots/drawings/single/<id>.png).
//   cd dev && node comida/crop.mjs <id> x0 y0 x1 y1   (coordenadas del dibujo, 0..1000)
// Guarda dev/shots/comida/crop-<id>.png con líneas (arriba) y coloreado (abajo).
import path from 'node:path';
import fs from 'node:fs';
import { launch, fileUrl, saveDataUrl, SHOTS } from '../lib.mjs';

const [id, ...n] = process.argv.slice(2);
const [x0, y0, x1, y1] = n.map(Number);
const t = await launch({ size: { width: 400, height: 300, dpr: 1 } });
const png = await t.page.evaluate(async ({ src, x0, y0, x1, y1 }) => {
  const img = new Image(); img.src = src; await img.decode();
  // Cada panel: 900 px de lado; el izquierdo empieza en x=10, el derecho en x=920 (y=10).
  const k = 0.9, S = 900 / ((x1 - x0) * k) * 1;
  const w = (x1 - x0) * k, h = (y1 - y0) * k;
  const c = document.createElement('canvas'); c.width = 900; c.height = Math.round(900 * h / w) * 2 + 10;
  const g = c.getContext('2d'); g.fillStyle = '#888'; g.fillRect(0, 0, c.width, c.height);
  const H = Math.round(900 * h / w);
  g.drawImage(img, 10 + x0 * k, 10 + y0 * k, w, h, 0, 0, 900, H);
  g.drawImage(img, 920 + x0 * k, 10 + y0 * k, w, h, 0, H + 10, 900, H);
  return c.toDataURL('image/png');
}, { src: 'data:image/png;base64,' + fs.readFileSync(path.join(SHOTS, 'drawings', 'single', id + '.png')).toString('base64'), x0, y0, x1, y1 });
console.log(saveDataUrl(png, path.join(SHOTS, 'comida', 'crop-' + id + '.png')));
await t.close();
