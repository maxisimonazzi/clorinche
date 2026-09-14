// Etapa 4: cámara.
// - Compu: visor en vivo con cámara falsa (--use-fake-device-for-media-stream), disparo y paso a la edición.
// - Compu sin permiso: cae al selector de archivos.
// - Táctil: abre el input con capture="environment" (cámara nativa).
//   node subir/camara.mjs
import { chromium } from 'playwright-core';
import { appUrl, shot, SIZES, launch } from '../lib.mjs';

const out = {};
const base = ['--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'];

async function open(args, size) {
  const s = SIZES[size] || size;
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: [...base, ...args] });
  const context = await browser.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: s.dpr, hasTouch: !!s.touch });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(appUrl('subir'));
  await page.waitForTimeout(500);
  return { browser, page, errors };
}

// 1) Visor en vivo (compu y ventana vertical sin touch).
for (const size of ['desktop', { width: 700, height: 900, dpr: 1, touch: false }]) {
  const name = typeof size === 'string' ? size : 'vertical';
  const { browser, page, errors } = await open(['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'], size);
  await page.click('.up-card--cam');
  await page.waitForFunction(() => CL.upload.debug().camera && document.querySelector('.up-video').videoWidth > 0, null, { timeout: 10000 });
  await page.waitForTimeout(900);
  const v = await page.evaluate(() => ({ view: CL.upload.debug().view, vw: document.querySelector('.up-video').videoWidth, vh: document.querySelector('.up-video').videoHeight }));
  await shot(page, `subir/camara-${name}-1-visor`);
  await page.click('.up-shutter');
  await page.waitForTimeout(120);
  await shot(page, `subir/camara-${name}-2-flash`);
  await page.waitForFunction(() => CL.upload.debug().view === 'edit' && CL.upload.debug().renders > 0 && !CL.upload.debug().busy, null, { timeout: 20000 });
  await page.waitForTimeout(400);
  const d = await page.evaluate(() => CL.upload.debug());
  await shot(page, `subir/camara-${name}-3-foto`);
  // Cancelar desde el visor
  await page.click('.up-bar .btn-back');
  await page.click('.up-card--cam');
  await page.waitForFunction(() => CL.upload.debug().camera, null, { timeout: 10000 });
  await page.click('.up-cam-close');
  await page.waitForTimeout(200);
  const afterCancel = await page.evaluate(() => CL.upload.debug());
  out['vivo-' + name] = {
    visor: v, trasDisparo: { view: d.view, src: d.src, camara: d.camera },
    cancelar: { view: afterCancel.view, camara: afterCancel.camera },
    ok: v.view === 'camera' && d.view === 'edit' && !d.camera && afterCancel.view === 'pick' && !afterCancel.camera,
    errors,
  };
  await browser.close();
}

// 2) Sin permiso: se abre el selector de archivos.
{
  const { browser, page, errors } = await open(['--use-fake-device-for-media-stream', '--deny-permission-prompts'], 'desktop');
  const chooser = page.waitForEvent('filechooser', { timeout: 8000 }).then(async (fc) => ({ ok: true, capture: await fc.element().getAttribute('capture') })).catch((e) => ({ ok: false, e: String(e) }));
  await page.click('.up-card--cam');
  const fc = await chooser;
  await page.waitForTimeout(300);
  const d = await page.evaluate(() => ({ view: CL.upload.debug().view, err: !document.querySelector('.up-err').hidden }));
  await shot(page, 'subir/camara-sin-permiso');
  out.sinPermiso = { selector: fc, ...d, ok: fc.ok && d.view === 'pick', errors };
  await browser.close();
}

// 3) Táctil (tablet y celular): input con capture.
for (const size of ['tablet', 'phone']) {
  const t = await launch({ size });
  await t.page.goto(appUrl('subir'));
  await t.page.waitForTimeout(400);
  const coarse = await t.page.evaluate(() => CL.util.isCoarse());
  const chooser = t.page.waitForEvent('filechooser', { timeout: 5000 }).then(async (fc) => ({ ok: true, capture: await fc.element().getAttribute('capture') })).catch((e) => ({ ok: false, e: String(e) }));
  await t.page.tap('.up-card--cam');
  const fc = await chooser;
  out['tactil-' + size] = { coarse, selector: fc, ok: !coarse || fc.capture === 'environment', errors: t.errors };
  await t.close();
}

console.log(JSON.stringify(out, null, 1));
