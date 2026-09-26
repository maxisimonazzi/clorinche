// Herramienta de desarrollo (fantasía): recorte ampliado de un dibujo (líneas | coloreado) para revisar uniones.
//   node fantasia/recorte.mjs <id> x0 y0 x1 y1   (coordenadas 0..1000 del dibujo) -> shots/fantasia/recorte-<id>.png
import fs from 'node:fs';
import path from 'node:path';
import { launch, fileUrl, DEV, SHOTS } from '../lib.mjs';
const [id, ...n] = process.argv.slice(2);
const [x0, y0, x1, y1] = n.map(Number);
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
const png = await t.page.evaluate(async ({ id, x0, y0, x1, y1 }) => {
  const a = await analyze(id, 7); // lienzos de 2048 px: a.src (líneas) y a.colored (zonas al azar)
  const k = a.src.width / 1000, w = (x1 - x0) * k, h = (y1 - y0) * k, esc = 700 / Math.max(w, h);
  const c = CL.util.canvas(Math.round(w * esc) * 2 + 20, Math.round(h * esc));
  const g = c.getContext('2d');
  g.fillStyle = '#888'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(a.src, x0 * k, y0 * k, w, h, 0, 0, w * esc, h * esc);
  g.drawImage(a.colored, x0 * k, y0 * k, w, h, w * esc + 20, 0, w * esc, h * esc);
  return c.toDataURL('image/png');
}, { id, x0, y0, x1, y1 });
const f = path.join(SHOTS, 'fantasia', `recorte-${id}.png`);
fs.mkdirSync(path.dirname(f), { recursive: true });
fs.writeFileSync(f, Buffer.from(png.split(',')[1], 'base64'));
console.log(f);
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
