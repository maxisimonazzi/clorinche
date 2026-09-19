// Utilidad: recorte ampliado (vecino más cercano) de una zona de la pantalla (px CSS).
import { saveDataUrl, SHOTS } from '../lib.mjs';
import path from 'node:path';

/** Guarda en dev/shots/<name>.png un recorte de la pizarra neón (fondo + trazos) ampliado `scale` veces. */
export async function zoomShot(page, name, clip, scale = 4) {
  const png = await page.screenshot({ clip, type: 'png' });
  const b64 = png.toString('base64');
  const url = await page.evaluate(async ({ b64, scale }) => {
    const img = await CL.util.loadImage('data:image/png;base64,' + b64);
    const c = CL.util.canvas(img.width * scale, img.height * scale);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }, { b64, scale });
  return saveDataUrl(url, path.join(SHOTS, name + '.png'));
}

/** Perfil de brillo perpendicular a un trazo horizontal: lee píxeles de la captura. */
export async function profile(page, x, y0, y1) {
  const png = await page.screenshot({ clip: { x, y: y0, width: 1, height: y1 - y0 } });
  return page.evaluate(async (b64) => {
    const img = await CL.util.loadImage('data:image/png;base64,' + b64);
    const c = CL.util.canvas(img.width, img.height);
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, 1, img.height).data;
    const out = [];
    for (let i = 0; i < img.height; i++) out.push([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
    return out;
  }, png.toString('base64'));
}
