// Recorte ampliado (líneas + coloreado) de una zona de un dibujo, para revisar detalles finos.
// Uso: cd dev && node mascotas/recorte.mjs <id> x0,y0,x1,y1 [nombre]   (coordenadas del lienzo 0..1000)
import path from 'node:path';
import { launch, fileUrl, DEV, SHOTS, saveDataUrl } from '../lib.mjs';
const [id, box, name] = process.argv.slice(2);
const [x0, y0, x1, y1] = box.split(',').map(Number);
const t = await launch({ size: { width: 800, height: 600, dpr: 1 } });
await t.page.goto(fileUrl(path.join(DEV, 'drawings', 'preview.html')));
await t.page.waitForFunction(() => window.ready);
const png = await t.page.evaluate(async ([id, x0, y0, x1, y1]) => {
  const a = await analyze(id, 7), k = RES / 1000, w = x1 - x0, h = y1 - y0, s = 700 / Math.max(w, h);
  const c = CL.util.canvas(Math.round(w * s) * 2 + 20, Math.round(h * s));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f3f0ea'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(a.src, x0 * k, y0 * k, w * k, h * k, 0, 0, w * s, h * s);
  ctx.drawImage(a.colored, x0 * k, y0 * k, w * k, h * k, w * s + 20, 0, w * s, h * s);
  return c.toDataURL('image/png');
}, [id, x0, y0, x1, y1]);
console.log(saveDataUrl(png, path.join(SHOTS, 'drawings', 'single', `${id}-${name || 'recorte'}.png`)));
await t.close();
