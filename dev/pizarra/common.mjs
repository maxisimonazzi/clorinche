// Ayudas compartidas por las pruebas de la pizarra.
import { rect, saveDataUrl, SHOTS } from '../lib.mjs';
import path from 'node:path';

/** Recorte ampliado (vecino más cercano, ×k) de fondo + trazos, en fracciones del tablero. */
export async function zoom(page, name, fx, fy, fw, fh, k = 3) {
  const url = await page.evaluate(([fx, fy, fw, fh, k]) => {
    const bg = document.querySelector('.pz-bg'), ly = document.querySelector('.pz-layer');
    const sx = Math.round(bg.width * fx), sy = Math.round(bg.height * fy);
    const sw = Math.round(bg.width * fw), sh = Math.round(bg.height * fh);
    const c = document.createElement('canvas');
    c.width = sw * k; c.height = sh * k;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(bg, sx, sy, sw, sh, 0, 0, sw * k, sh * k);
    x.drawImage(ly, sx, sy, sw, sh, 0, 0, sw * k, sh * k);
    return c.toDataURL();
  }, [fx, fy, fw, fh, k]);
  return saveDataUrl(url, path.join(SHOTS, 'pizarra', name + '.png'));
}

/** Espera a que la pizarra esté montada y con documento. */
export async function ready(page) {
  await page.waitForFunction(() => window.CL && CL.pizarra && CL.pizarra.current && CL.pizarra.current.doc, null, { timeout: 8000 });
  await page.waitForTimeout(350);
}

/** Rectángulo del tablero en px CSS del viewport. */
export const board = (page) => rect(page, '.pz-board');

/** Convierte fracciones (0..1) del tablero a px del viewport. */
export function at(b, fx, fy) { return [b.x + b.width * fx, b.y + b.height * fy]; }

/** Recorrido ondulado horizontal en el tablero (fracciones). */
export function wave(b, y, x0 = 0.08, x1 = 0.92, amp = 0.05, n = 10) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(at(b, x0 + (x1 - x0) * t, y + Math.sin(t * Math.PI * 2) * amp));
  }
  return pts;
}

export const T = (page) => ({
  tool: (id) => page.evaluate((id) => CL.pizarra.current._test.selectTool(id), id),
  color: (c) => page.evaluate((c) => CL.pizarra.current._test.selectColor(c), c),
  size: (i) => page.evaluate((i) => CL.pizarra.current._test.selectSize(i), i),
  bg: (id) => page.evaluate((id) => CL.pizarra.current._test.setBg(id), id),
  info: () => page.evaluate(() => {
    const c = CL.pizarra.current;
    return { doc: c.doc, scale: c._test.scale, hasContent: c._test.hasContent, undo: c._test.undoCount, work: c.work && { id: c.work.id, status: c.work.status } };
  }),
});

/** Borra la base de datos para empezar limpio. */
export async function resetDb(page) {
  await page.evaluate(async () => {
    const list = await CL.db.works.list();
    for (const w of list) await CL.db.works.del(w.id);
    try { localStorage.clear(); } catch (e) { /* nada */ }
  });
}
