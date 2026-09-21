// Revisión 1 (QA galería + inicio): utilidades compartidas por los scripts r1-*.mjs.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { stroke } from '../../lib.mjs';

/** Errores de archivos de otros agentes (en construcción): se informan aparte y no cuentan. */
const MINE = /gallery\/galeria\.js|js\/home\.js/;
export const foreign = (x) => /\/app\/js\//.test(x) && !MINE.test(x);
export const clean = (e) => e.filter((x) => {
  if (/icons\/.*\.png|ERR_FILE_NOT_FOUND/.test(x)) return false;
  if (foreign(x)) { console.log('   (error ajeno, se ignora) ' + x.split('\n').slice(0, 2).join(' ').slice(0, 200)); return false; }
  return true;
});
export const results = [];
export const ok = (cond, msg) => {
  const line = (cond ? 'OK    ' : 'FALLA ') + msg;
  results.push(line);
  console.log(line);
  return cond;
};
export const PROFILE = process.env.R1_PROFILE || path.join(os.tmpdir(), 'colorinche-r1-profile');
export const freshProfile = () => { fs.rmSync(PROFILE, { recursive: true, force: true }); return PROFILE; };

export const center = async (page, sel) => {
  const b = await page.locator(sel).first().boundingBox();
  if (!b) throw new Error('sin caja: ' + sel);
  return [b.x + b.width / 2, b.y + b.height / 2, b];
};

export const state = (page) => page.evaluate(() => ({
  hash: decodeURIComponent(location.hash),
  modal: document.querySelectorAll('.modal-back').length,
  tab: document.querySelector('.gal-tab.active')?.getAttribute('aria-label') || null,
  cards: document.querySelectorAll('.gal-card:not(.gal-leaving)').length,
  screen: document.body.dataset.screen,
  hist: history.length,
  hstate: history.state,
}));

export const dbWorks = (page) => page.evaluate(async () =>
  (await CL.db.works.list()).map((w) => ({ id: w.id, kind: w.kind, source: w.source, status: w.status, w: w.w, h: w.h, thumb: w.thumb ? w.thumb.type + ':' + w.thumb.size : null })));

/** Instrumenta URLs de blob vivas, listeners en window/document y RAF pendientes. */
export const instrument = () => {
  const live = new Set();
  const c = URL.createObjectURL.bind(URL), r = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (o) => { const u = c(o); live.add(u); return u; };
  URL.revokeObjectURL = (u) => { live.delete(u); return r(u); };
  window.__liveUrls = () => live.size;
  const counts = {};
  const add = EventTarget.prototype.addEventListener, rem = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, o) {
    if (this === document || this === window) counts[type] = (counts[type] || 0) + 1;
    return add.call(this, type, fn, o);
  };
  EventTarget.prototype.removeEventListener = function (type, fn, o) {
    if (this === document || this === window) counts[type] = (counts[type] || 0) - 1;
    return rem.call(this, type, fn, o);
  };
  window.__listeners = () => Object.assign({}, counts);
  // Descargas disparadas (a[download].click)
  window.__downloads = [];
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.download) window.__downloads.push(this.download); return click.call(this); };
};

/** Obras sintéticas (thumbs en canvas) con datos compatibles con los exportPNG reales. */
export async function seedSynthetic(page, { done = 9, progress = 3, missingThumb = false, tag = '' } = {}) {
  return page.evaluate(async ({ done, progress, missingThumb, tag }) => {
    const U = CL.util;
    const pal = ['#ff5a5f', '#ff9f1c', '#ffd23f', '#2bc48a', '#4cc3ff', '#7b61ff', '#ff8fc7'];
    const kinds = ['colorear', 'pizarra', 'neon'];
    const ids = [];
    const n = done + progress;
    for (let i = 0; i < n; i++) {
      const kind = kinds[i % 3];
      let w = 480, h = 480;
      if (kind === 'pizarra') { if (i % 2) { w = 480; h = 300; } else { w = 300; h = 480; } }
      if (kind === 'neon') { if (i % 2) { w = 480; h = 270; } else { w = 270; h = 480; } }
      const c = U.canvas(w, h);
      const x = c.getContext('2d');
      x.fillStyle = kind === 'neon' ? '#0d0620' : '#fff';
      x.fillRect(0, 0, w, h);
      x.lineWidth = 14; x.lineCap = 'round';
      for (let k = 0; k < 5; k++) {
        x.strokeStyle = pal[(i + k) % pal.length];
        x.beginPath(); x.arc(w / 2, h / 2, 20 + k * 22, k, k + 4.5); x.stroke();
      }
      x.fillStyle = kind === 'neon' ? '#fff' : '#000';
      x.font = 'bold 64px sans-serif';
      x.fillText(tag + i, 12, 64);
      const thumb = await U.canvasToBlob(c, i % 2 ? 'image/jpeg' : 'image/png', 0.9);
      const paintC = U.canvas(w * 2, h * 2);
      const pctx = paintC.getContext('2d');
      pctx.strokeStyle = pal[i % pal.length]; pctx.lineWidth = 30;
      pctx.beginPath(); pctx.moveTo(40, 40); pctx.lineTo(w * 2 - 40, h * 2 - 40); pctx.stroke();
      const wk = await CL.db.works.save({
        kind,
        source: kind === 'colorear' ? (i % 2 ? 'vaca' : 'gato') : kind,
        status: i < done ? 'done' : 'progress',
        w: kind === 'colorear' ? 1024 : w * 2, h: kind === 'colorear' ? 1024 : h * 2,
        paint: kind === 'colorear' ? null : await U.canvasToBlob(paintC, 'image/png'),
        thumb: missingThumb && i === 0 ? null : thumb,
        meta: kind === 'pizarra' ? { bg: 'blanco', docW: w * 2, docH: h * 2 } : kind === 'neon' ? { dpr: 1, view: { w: w * 2, h: h * 2 } } : {},
      });
      ids.push({ id: wk.id, kind, status: wk.status, i });
      await new Promise((r) => setTimeout(r, 3));
    }
    return ids;
  }, { done, progress, missingThumb, tag });
}

/** Crea obras reales con los módulos (colorear, pizarra, neón), terminadas o no. Devuelve ids. */
export async function makeReal(page, appUrl) {
  const out = {};
  const waitObras = async () => {
    await page.waitForFunction(() => location.hash.startsWith('#obras/'), null, { timeout: 20000 });
    await page.waitForTimeout(600);
    return page.evaluate(() => decodeURIComponent(location.hash).slice(7));
  };
  // colorear vaca terminada
  await page.goto(appUrl('colorear/vaca'));
  await page.waitForTimeout(2500);
  let bb = await page.locator('.cl-board').boundingBox();
  for (const [fx, fy] of [[0.5, 0.5], [0.3, 0.7], [0.7, 0.7], [0.5, 0.2], [0.2, 0.3], [0.8, 0.3]]) {
    await page.mouse.click(bb.x + bb.width * fx, bb.y + bb.height * fy);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(400);
  await page.locator('.cl-done').click();
  out.colorearDone = await waitObras();
  // colorear gato sin terminar (sale con la casita)
  await page.evaluate(() => CL.router.go('colorear/gato'));
  await page.waitForTimeout(2500);
  bb = await page.locator('.cl-board').boundingBox();
  for (const [fx, fy] of [[0.5, 0.5], [0.5, 0.25]]) { await page.mouse.click(bb.x + bb.width * fx, bb.y + bb.height * fy); await page.waitForTimeout(150); }
  await page.waitForTimeout(1200);
  await page.evaluate(() => CL.router.go('inicio'));
  await page.waitForTimeout(1200);
  // pizarra terminada
  await page.evaluate(() => CL.router.go('pizarra'));
  await page.waitForTimeout(1800);
  let b = await page.locator('.pz-board').boundingBox();
  await stroke(page, [[b.x + b.width * 0.2, b.y + b.height * 0.3], [b.x + b.width * 0.5, b.y + b.height * 0.7], [b.x + b.width * 0.8, b.y + b.height * 0.3]], { steps: 30 });
  await page.waitForTimeout(400);
  await page.locator('.pz-done').click();
  out.pizarraDone = await waitObras();
  // neón terminada
  await page.evaluate(() => CL.router.go('neon'));
  await page.waitForTimeout(1800);
  b = await page.locator('.neon-stage').boundingBox();
  await stroke(page, [[b.x + b.width * 0.2, b.y + b.height * 0.5], [b.x + b.width * 0.5, b.y + b.height * 0.2], [b.x + b.width * 0.8, b.y + b.height * 0.6]], { steps: 30 });
  await page.waitForTimeout(400);
  await page.locator('.neon-done').click();
  out.neonDone = await waitObras();
  // pizarra sin terminar
  await page.evaluate(() => CL.router.go('pizarra'));
  await page.waitForTimeout(1800);
  b = await page.locator('.pz-board').boundingBox();
  await stroke(page, [[b.x + b.width * 0.3, b.y + b.height * 0.6], [b.x + b.width * 0.6, b.y + b.height * 0.3]], { steps: 20 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => CL.router.go('inicio'));
  await page.waitForTimeout(1200);
  return out;
}

/* Toques con una sesión CDP propia (para poder soltar un solo dedo con touchEnd + ese punto;
   lib.touches() con menos dedos no los suelta en esta versión de Edge). */
const sessions = new WeakMap();
const cdpOf = async (page) => { if (!sessions.has(page)) sessions.set(page, await page.context().newCDPSession(page)); return sessions.get(page); };
const pts = (points) => points.map((p, i) => ({ x: p.x, y: p.y, id: p.id ?? i + 1 }));
/** Apoya (o mueve) el conjunto completo de dedos indicado. */
export async function tStart(page, points) { return (await cdpOf(page)).send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(points) }); }
/** Levanta SÓLO los dedos indicados (los demás siguen apoyados). */
export async function lift(page, points) { return (await cdpOf(page)).send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: pts(points) }); }
/** Levanta todos. */
export async function tEnd(page) { return (await cdpOf(page)).send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
