// Recorta una zona de un dibujo (líneas + coloreado) para mirarla de cerca.
//   node paisajes/zoom.mjs <id> <x0> <y0> <x1> <y1>   (coordenadas 0..1000) -> shots/paisajes/zoom/<id>.png
import path from 'node:path';
import { launch, fileUrl, saveDataUrl, SHOTS, DEV } from '../lib.mjs';
const [id, x0, y0, x1, y1] = process.argv.slice(2);
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
const png = await t.page.evaluate(async ({ id, box }) => {
  const a = await analyze(id, 7);
  const k = 2048 / 1000, [bx0, by0, bx1, by1] = box.map(Number);
  const w = (bx1 - bx0) * k, h = (by1 - by0) * k, s = Math.min(1, 900 / Math.max(w, h));
  const c = CL.util.canvas(Math.round(w * s) * 2 + 20, Math.round(h * s));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f3f0ea'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(a.src, bx0 * k, by0 * k, w, h, 0, 0, w * s, h * s);
  ctx.drawImage(a.colored, bx0 * k, by0 * k, w, h, w * s + 20, 0, w * s, h * s);
  return c.toDataURL('image/png');
}, { id, box: [x0, y0, x1, y1] });
console.log(saveDataUrl(png, path.join(SHOTS, 'paisajes', 'zoom', id + '.png')));
await t.close();
