// Ayudas de la revisión de la pizarra (QA independiente).
import { launch, appUrl, shot, stroke, multiStroke, tap, SIZES, rect, saveDataUrl, SHOTS } from '../../lib.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export { launch, appUrl, stroke, multiStroke, tap, SIZES, rect };

export const S = (page, name) => shot(page, 'pizarra/fix1/' + name);

export async function ready(page) {
  await page.waitForFunction(() => window.CL && CL.pizarra && CL.pizarra.current && CL.pizarra.current.doc, null, { timeout: 10000 });
  await page.waitForTimeout(350);
}

export const board = (page) => rect(page, '.pz-board');
export function at(b, fx, fy) { return [b.x + b.width * fx, b.y + b.height * fy]; }
export function wave(b, y, x0 = 0.08, x1 = 0.92, amp = 0.05, n = 10) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(at(b, x0 + (x1 - x0) * t, y + Math.sin(t * Math.PI * 2) * amp));
  }
  return pts;
}

/** Abre un navegador con perfil persistente nuevo y la pizarra limpia. */
export async function open(size, hash = 'pizarra') {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pzfix-'));
  const t = await launch({ size, persistent: profile });
  t.profile = profile;
  const close = t.close;
  t.close = async () => { await close(); try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* nada */ } };
  await t.page.goto(appUrl(hash));
  if (hash.startsWith('pizarra')) await ready(t.page);
  return t;
}

/** Toque real (dedo o mouse según el tamaño) en el centro de un selector. */
export async function click(t, sel, wait = 250) {
  const r = await t.page.locator(sel).first().boundingBox();
  if (!r) throw new Error('no está: ' + sel);
  if (t.size.touch) await tap(t.page, r.x + r.width / 2, r.y + r.height / 2);
  else await t.page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
  if (wait) await t.page.waitForTimeout(wait);
}

export const info = (page) => page.evaluate(() => {
  const c = CL.pizarra.current;
  if (!c) return null;
  return { doc: c.doc, scale: c._test.scale, hasContent: c._test.hasContent, undo: c._test.undoCount, work: c.work && { id: c.work.id, status: c.work.status }, state: Object.assign({}, c.state) };
});

/** Cantidad de píxeles con alfa > 0 en la capa de trazos (muestreado). */
export const inked = (page) => page.evaluate(() => {
  const c = CL.pizarra.current._test.layer;
  const x = c.getContext('2d');
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 16) if (d[i] > 8) n++;
  return n;
});

export const works = (page) => page.evaluate(async () => (await CL.db.works.list({ kind: 'pizarra' })).map((w) => ({ id: w.id, status: w.status, bg: w.meta && w.meta.bg, w: w.w, h: w.h, docW: w.meta && w.meta.docW, docH: w.meta && w.meta.docH })));

export function saveUrl(url, name) { return saveDataUrl(url, path.join(SHOTS, 'pizarra/fix1', name + '.png')); }

/** Recorte ampliado de fondo + trazos, en fracciones del tablero. */
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
  return saveUrl(url, name);
}

/** Todos los rectángulos de los controles, para detectar cortes y superposiciones. */
export const controls = (page) => page.evaluate(() => {
  const vw = innerWidth, vh = innerHeight;
  const out = [];
  const sel = '.pz-top .btn, .pz-tool, .pz-size, .pz-bgbtn, .pz-swatch';
  for (const e of document.querySelectorAll(sel)) {
    const r = e.getBoundingClientRect();
    out.push({ n: (e.getAttribute('aria-label') || e.className).slice(0, 24), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), off: r.left < 0 || r.top < 0 || r.right > vw + 0.5 || r.bottom > vh + 0.5 });
  }
  const b = document.querySelector('.pz-board').getBoundingClientRect();
  const bad = [];
  for (const o of out) {
    if (o.off) bad.push('fuera: ' + o.n);
    const ix = Math.min(o.x + o.w, b.right) - Math.max(o.x, b.left), iy = Math.min(o.y + o.h, b.bottom) - Math.max(o.y, b.top);
    if (ix > 2 && iy > 2) bad.push('sobre el tablero: ' + o.n);
  }
  for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
    const a = out[i], c = out[j];
    const ix = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x), iy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
    if (ix > 2 && iy > 2) bad.push('superpuestos: ' + a.n + ' / ' + c.n);
  }
  const small = out.filter((o) => Math.min(o.w, o.h) < 40).map((o) => o.n + ' ' + o.w + 'x' + o.h);
  return { n: out.length, board: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }, bad, small, scrollW: document.documentElement.scrollWidth, vw, vh };
});
