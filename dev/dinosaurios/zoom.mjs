// Zoom de una parte de un dibujo coloreado al azar (para revisar huecos y tiras finas de cerca).
//   cd dev && node dinosaurios/zoom.mjs <id> <x0> <y0> <x1> <y1> [semilla]
// Coordenadas del lienzo 1000 × 1000. Guarda dev/shots/dinosaurios/zoom-<id>.png (800 px de ancho).
import path from 'node:path';
import { launch, fileUrl, saveDataUrl, SHOTS, DEV } from '../lib.mjs';

const [id, ...rest] = process.argv.slice(2);
const [x0, y0, x1, y1, seed = 7] = rest.map(Number);
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
const png = await t.page.evaluate(async ([id, x0, y0, x1, y1, seed]) => {
  const a = await analyze(id, seed);
  const k = a.colored.width / 1000;
  const W = 800, H = Math.round((W * (y1 - y0)) / (x1 - x0));
  const c = CL.util.canvas(W, H);
  const ctx = c.getContext('2d');
  ctx.drawImage(a.colored, x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k, 0, 0, W, H);
  return c.toDataURL('image/png');
}, [id, x0, y0, x1, y1, seed]);
console.log(saveDataUrl(png, path.join(SHOTS, 'dinosaurios', `zoom-${id}.png`)));
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
