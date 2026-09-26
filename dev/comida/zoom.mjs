// Recortes ampliados de un dibujo (líneas + zonas coloreadas) para revisar detalles finos.
//   node comida/zoom.mjs <id> <x0> <y0> <x1> <y1> [nombre]   (coordenadas en unidades 0..1000)
import path from 'node:path';
import { launch, fileUrl, saveDataUrl, SHOTS, DEV } from '../lib.mjs';

const [id, x0, y0, x1, y1, nombre] = process.argv.slice(2);
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
const png = await t.page.evaluate(async ({ id, r }) => {
  const a = await analyze(id, 7);
  const k = 2048 / 1000;
  const [sx, sy, sw, sh] = [r[0] * k, r[1] * k, (r[2] - r[0]) * k, (r[3] - r[1]) * k];
  const scale = Math.min(900 / sw, 900 / sh);
  const W = Math.round(sw * scale), H = Math.round(sh * scale);
  const c = CL.util.canvas(W * 2 + 20, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f3f0ea'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(a.src, sx, sy, sw, sh, 0, 0, W, H);
  ctx.drawImage(a.colored, sx, sy, sw, sh, W + 20, 0, W, H);
  return c.toDataURL('image/png');
}, { id, r: [x0, y0, x1, y1].map(Number) });
const f = saveDataUrl(png, path.join(SHOTS, 'comida', (nombre || `${id}-${x0}-${y0}`) + '.png'));
console.log('->', f);
if (t.errors.length) console.log('ERRORES:\n' + t.errors.join('\n'));
await t.close();
