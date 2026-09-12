// Utilidades comunes de la revisión QA del módulo colorear.
import { launch, appUrl, shot, stroke, tap, multiStroke, touches, touchStart } from '../lib.mjs';
export { launch, appUrl, shot, stroke, tap, multiStroke, touches, touchStart };

export const ready = (page, timeout = 15000) => page.waitForFunction(
  () => document.querySelectorAll('.screen').length === 1 && !!document.querySelector('.screen--colorear.cl-ready'), null, { timeout });

export const boardRect = (page) => page.evaluate(() => document.querySelector('.cl-board').getBoundingClientRect().toJSON());

/** Punto de pantalla para una fracción del dibujo. */
export async function P(page, fx, fy) {
  const b = await boardRect(page);
  return [b.x + b.width * fx, b.y + b.height * fy];
}

/** Toque (touch en tamaños táctiles, mouse en desktop). */
export async function hit(t, x, y) {
  if (t.size.touch) await tap(t.page, x, y); else await t.page.mouse.click(x, y);
}
export async function hitSel(t, sel) {
  const loc = t.page.locator(sel).first();
  const vis = await loc.evaluate((e) => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; });
  if (!vis) { await loc.evaluate((e) => e.scrollIntoView({ block: 'nearest', inline: 'nearest' })); await t.page.waitForTimeout(150); }
  const r = await loc.boundingBox();
  if (!r) throw new Error('no encontrado ' + sel);
  await hit(t, r.x + r.width / 2, r.y + r.height / 2);
}
export async function paintAt(t, fx, fy, wait = 320) {
  const [x, y] = await P(t.page, fx, fy);
  await hit(t, x, y);
  await t.page.waitForTimeout(wait);
}
/** Muestra RGBA de la capa de pintura en fracciones del dibujo. */
export const samplePaint = (page, pts) => page.evaluate((pts) => {
  const c = CL.coloring.screen.painter.canvas; const ctx = c.getContext('2d');
  return pts.map(([fx, fy]) => Array.from(ctx.getImageData(Math.round(c.width * fx), Math.round(c.height * fy), 1, 1).data));
}, pts);

export const filterErrors = (errs) => errs.filter((e) => !/icons\/.*png|ERR_FILE_NOT_FOUND/.test(e));
