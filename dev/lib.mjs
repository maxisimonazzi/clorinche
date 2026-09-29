// Colorines — utilidades de verificación con Edge headless (Playwright).
// Uso típico:
//   import { launch, appUrl, shot, stroke, multiStroke } from './lib.mjs';
//   const t = await launch({ size: 'tablet' });
//   await t.page.goto(appUrl('pizarra'));
//   await stroke(t.page, [[100,100],[300,200]], { pointer: 'touch' });
//   await shot(t.page, 'pizarra/tablet-1');
//   console.log(t.errors); await t.close();
import { chromium } from 'playwright-core';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

export const DEV = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(DEV, '..');
export const APP = path.join(ROOT, 'app');
export const SHOTS = path.join(DEV, 'shots');

/** URL file:// de la app con un hash de ruta opcional ('colorear/vaca'). */
export const appUrl = (hash = '') =>
  pathToFileURL(path.join(APP, 'index.html')).href + (hash ? '#' + hash : '');

export const fileUrl = (p) => pathToFileURL(path.resolve(p)).href;

/** Tamaños de prueba. dpr = devicePixelRatio. */
export const SIZES = {
  desktop: { width: 1366, height: 768, dpr: 1, touch: false },
  desktopHD: { width: 1920, height: 1080, dpr: 1, touch: false },
  tablet: { width: 1024, height: 768, dpr: 2, touch: true },
  tabletV: { width: 768, height: 1024, dpr: 2, touch: true },
  phone: { width: 390, height: 844, dpr: 3, touch: true },
  phoneH: { width: 844, height: 390, dpr: 3, touch: true },
  phoneSmall: { width: 360, height: 640, dpr: 2, touch: true },
};

/**
 * Abre Edge headless.
 * opts.size: nombre de SIZES u objeto {width,height,dpr,touch}
 * opts.persistent: carpeta de perfil (para probar datos que sobreviven a cerrar el navegador)
 */
export async function launch({ size = 'desktop', headless = true, persistent = null } = {}) {
  const s = typeof size === 'string' ? SIZES[size] : size;
  const ctxOpts = {
    viewport: { width: s.width, height: s.height },
    deviceScaleFactor: s.dpr,
    hasTouch: !!s.touch,
    isMobile: !!s.touch && Math.min(s.width, s.height) < 600,
  };
  const args = ['--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'];
  let browser = null, context;
  if (persistent) {
    context = await chromium.launchPersistentContext(persistent, { channel: 'msedge', headless, args, ...ctxOpts });
  } else {
    browser = await chromium.launch({ channel: 'msedge', headless, args });
    context = await browser.newContext(ctxOpts);
  }
  const page = context.pages()[0] || (await context.newPage());
  const errors = [];
  const watch = (p) => {
    p.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e)));
    p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  };
  watch(page);
  context.on('page', watch);
  return {
    browser, context, page, errors, size: s,
    close: async () => { if (browser) await browser.close(); else await context.close(); },
  };
}

/** Captura de pantalla en dev/shots/<name>.png (crea carpetas). Devuelve la ruta. */
export async function shot(page, name, opts = {}) {
  const file = path.join(SHOTS, name.endsWith('.png') ? name : name + '.png');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, ...opts });
  return file;
}

/** Guarda un dataURL PNG en disco. */
export function saveDataUrl(dataUrl, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  return file;
}

const cdpCache = new WeakMap();
async function cdp(page) {
  if (!cdpCache.has(page)) cdpCache.set(page, await page.context().newCDPSession(page));
  return cdpCache.get(page);
}

/** Interpola una polilínea en `steps` puntos. */
export function interp(points, steps) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i - 1], [x2, y2] = points[i];
    const len = Math.hypot(x2 - x1, y2 - y1);
    segs.push({ x1, y1, x2, y2, len });
    total += len;
  }
  if (!segs.length) return [points[0]];
  const out = [];
  for (let k = 0; k <= steps; k++) {
    let d = (total * k) / steps;
    for (const s of segs) {
      if (d <= s.len || s === segs[segs.length - 1]) {
        const t = s.len ? Math.min(1, d / s.len) : 0;
        out.push([s.x1 + (s.x2 - s.x1) * t, s.y1 + (s.y2 - s.y1) * t]);
        break;
      }
      d -= s.len;
    }
  }
  return out;
}

/**
 * Traza un recorrido. points en píxeles CSS del viewport.
 * opts.pointer: 'mouse' | 'touch'; opts.steps: cantidad de movimientos; opts.delay: ms entre pasos.
 */
export async function stroke(page, points, { pointer = 'mouse', steps = 24, delay = 8, release = true } = {}) {
  const pts = interp(points, steps);
  if (pointer === 'touch') {
    await multiStroke(page, [points], { steps, delay, release });
    return;
  }
  await page.mouse.move(pts[0][0], pts[0][1]);
  await page.mouse.down();
  for (const [x, y] of pts.slice(1)) {
    await page.mouse.move(x, y);
    if (delay) await page.waitForTimeout(delay);
  }
  if (release) await page.mouse.up();
}

/** Toque simple (dedo) en x,y. */
export async function tap(page, x, y, { pointer = 'touch' } = {}) {
  if (pointer === 'touch') {
    const c = await cdp(page);
    await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.mouse.click(x, y);
  }
}

/**
 * Varios dedos a la vez (multitouch real vía CDP).
 * paths: [[[x,y],...], [[x,y],...]]  — un recorrido por dedo.
 */
export async function multiStroke(page, paths, { steps = 24, delay = 8, release = true } = {}) {
  const c = await cdp(page);
  const all = paths.map((p) => interp(p, steps));
  const pts = (k) => all.map((p, i) => ({ x: p[k][0], y: p[k][1], id: i + 1, radiusX: 4, radiusY: 4, force: 0.5 }));
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(0) });
  for (let k = 1; k <= steps; k++) {
    await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(k) });
    if (delay) await page.waitForTimeout(delay);
  }
  if (release) await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

/** Envía el conjunto completo de dedos apoyados (los que faltan se levantan). Para gestos a mano. */
export async function touches(page, points) {
  const c = await cdp(page);
  if (!points.length) return c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  return c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points.map((p, i) => ({ x: p.x, y: p.y, id: p.id ?? i + 1 })) });
}
export async function touchStart(page, points) {
  const c = await cdp(page);
  return c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points.map((p, i) => ({ x: p.x, y: p.y, id: p.id ?? i + 1 })) });
}

/** Rectángulo (CSS px) de un selector. */
export async function rect(page, selector) {
  return page.locator(selector).first().boundingBox();
}

/** Espera a que no haya animaciones de pantalla pendientes. */
export const settle = (page, ms = 400) => page.waitForTimeout(ms);
