// Colorinche — el service worker NO se adueña de otras páginas del mismo sitio.
// Escenarios (sobre copias temporales de app/ con sw.js regenerado):
//  A. App en la RAÍZ de un origen que tiene otras páginas (repo usuario.github.io, localhost reusado):
//     con internet /otro/ y /blog.html se ven tal cual, sus archivos (css) NO quedan en la caché de la app
//     y siempre llegan frescos; una dirección que no existe (404) → la app; sin internet → la app.
//  B. App en una SUBCARPETA (/colorinche/, como un repo de proyecto de GitHub Pages): funciona, /colorinche/x
//     inexistente → la app, y /otro/ (fuera del alcance) ni pasa por el SW.
// Capturas: dev/shots/pwa/origen-*.png
// Uso: cd dev && node pwa/pwa-origen.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launch, shot, APP } from '../lib.mjs';
import { startServer, swState } from './helpers.mjs';
import { buildSw } from '../build-sw.mjs';

let fails = 0;
const check = (ok, msg) => { console.log((ok ? '  ok   ' : '  FALLA ') + msg); if (!ok) fails++; };
const OTRO = (color) => `<!doctype html><meta charset="utf-8"><title>otro proyecto</title>
<link rel="stylesheet" href="estilo.css"><h1 style="font:40px sans-serif">Otro proyecto (${color})</h1>`;

/** Anota la dirección de cada 404 que aparece en la consola. */
function trackErrors(page) {
  const list = [];
  page.on('console', (m) => { if (m.type() === 'error' && /404/.test(m.text())) list.push(m.location().url); });
  return list;
}
/** Los 404 esperables (el favicon.ico que no tiene la página de prueba "otro" y las direcciones inexistentes
    que se piden a propósito) no cuentan; cualquier otro error sí. */
function reportErrors(t, e404) {
  const ok404 = e404.filter((u) => /favicon\.ico|no\/existe|viejo\/enlace/.test(u));
  const rest = t.errors.length - ok404.length;
  if (ok404.length) console.log('  (404 esperables: ' + ok404.join(', ') + ')');
  check(rest === 0, 'sin errores de consola' + (rest ? ': ' + JSON.stringify(t.errors) + ' 404 en ' + JSON.stringify(e404) : ''));
}

/** Copia app/ en `dest` y deja su sw.js al día. */
function copyApp(dest) {
  fs.cpSync(APP, dest, { recursive: true });
  const r = buildSw(dest);
  if (!r.upToDate) fs.writeFileSync(r.sw, r.next);
  return r.version;
}
const pageInfo = (page) => page.evaluate(() => ({
  path: location.pathname, title: document.title, app: !!window.CL,
  bg: getComputedStyle(document.body).backgroundColor,
}));

// ---------- A. raíz de un origen compartido ----------
{
  console.log('\n=== A. app en la raíz de un sitio con otras páginas ===');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'colorinche-orA-'));
  const root = path.join(tmp, 'sitio');
  copyApp(root);
  fs.mkdirSync(path.join(root, 'otro'));
  fs.writeFileSync(path.join(root, 'otro', 'index.html'), OTRO('rojo'));
  fs.writeFileSync(path.join(root, 'otro', 'estilo.css'), 'body{background:rgb(255,0,0)}');
  fs.writeFileSync(path.join(root, 'blog.html'), '<!doctype html><title>blog</title><h1>Blog</h1>');
  let srv = await startServer(8793, root);
  const t = await launch({ size: 'desktop', persistent: path.join(tmp, 'perfil') });
  const { page, context } = t;
  const e404 = trackErrors(page);
  try {
    await page.goto(srv.url);
    const st = await swState(page);
    check(st.state === 'activated' && st.cached === st.expected, `SW activo con alcance ${st.scope}, ${st.cached} archivos`);
    await page.reload(); await page.waitForTimeout(400);

    let r = await page.goto(srv.url + 'otro/'); await page.waitForTimeout(400);
    let i = await pageInfo(page);
    check(r.status() === 200 && !i.app && i.path === '/otro/' && i.bg === 'rgb(255, 0, 0)', `con internet /otro/ → ${r.status()} ${i.path} "${i.title}" fondo ${i.bg}`);
    await shot(page, 'pwa/origen-A-otro-rojo');
    // La otra página cambia: tiene que verse el cambio (nada quedó "congelado" en la caché de Colorinche).
    fs.writeFileSync(path.join(root, 'otro', 'index.html'), OTRO('verde'));
    fs.writeFileSync(path.join(root, 'otro', 'estilo.css'), 'body{background:rgb(0,160,0)}');
    await page.goto(srv.url + 'otro/'); await page.waitForTimeout(400);
    i = await pageInfo(page);
    check(i.bg === 'rgb(0, 160, 0)' && /verde/.test(await page.textContent('h1')), `la otra página actualizada se ve nueva (fondo ${i.bg})`);
    await shot(page, 'pwa/origen-A-otro-verde');
    const leaked = await page.evaluate(async () => {
      const out = [];
      for (const n of await caches.keys()) for (const k of await (await caches.open(n)).keys()) if (/\/otro\/|blog/.test(k.url)) out.push(n + ' ' + k.url);
      return out;
    });
    check(!leaked.length, 'la caché de Colorinche no guardó nada de las otras páginas' + (leaked.length ? ': ' + leaked.join(', ') : ''));

    r = await page.goto(srv.url + 'blog.html'); await page.waitForTimeout(300);
    i = await pageInfo(page);
    check(r.status() === 200 && !i.app && i.title === 'blog', `con internet /blog.html → ${r.status()} "${i.title}"`);
    r = await page.goto(srv.url + 'no/existe'); await page.waitForTimeout(700);
    i = await pageInfo(page);
    check(i.app && i.path === '/index.html', `con internet /no/existe (404) → la app (${i.path})`);
    await page.goto(srv.url + 'index.html#dibujos'); await page.waitForTimeout(800);
    i = await pageInfo(page);
    check(i.app && await page.evaluate(() => document.body.dataset.screen) === 'dibujos', 'con internet /index.html#dibujos → catálogo');

    // Sin internet: las otras páginas no están → la app (mejor que una pantalla de error).
    await srv.stop();
    await context.setOffline(true);
    r = await page.goto(srv.url + 'otro/'); await page.waitForTimeout(800);
    i = await pageInfo(page);
    check(i.app && i.path === '/index.html', `sin internet /otro/ → la app (${i.path})`);
    r = await page.goto(srv.url); await page.waitForTimeout(800);
    i = await pageInfo(page);
    check(r.ok() && i.app, `sin internet / → la app (${r.status()})`);
    await shot(page, 'pwa/origen-A-offline');
  } catch (e) {
    check(false, 'excepción: ' + (e.stack || e));
  } finally {
    reportErrors(t, e404);
    await t.close(); await srv.stop();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ---------- B. subcarpeta (repo de proyecto de GitHub Pages) ----------
{
  console.log('\n=== B. app en /colorinche/ (repo de proyecto) ===');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'colorinche-orB-'));
  const root = path.join(tmp, 'sitio');
  fs.mkdirSync(path.join(root, 'otro'), { recursive: true });
  copyApp(path.join(root, 'colorinche'));
  fs.writeFileSync(path.join(root, 'otro', 'index.html'), OTRO('rojo'));
  fs.writeFileSync(path.join(root, 'otro', 'estilo.css'), 'body{background:rgb(255,0,0)}');
  let srv = await startServer(8794, root);
  const t = await launch({ size: 'tablet', persistent: path.join(tmp, 'perfil') });
  const { page, context } = t;
  const e404 = trackErrors(page);
  try {
    await page.goto(srv.url + 'colorinche/');
    const st = await swState(page);
    check(st.state === 'activated' && st.cached === st.expected && st.scope.endsWith('/colorinche/'), `SW activo con alcance ${st.scope}`);
    await page.reload(); await page.waitForTimeout(400);
    const cdp = await context.newCDPSession(page);
    const inst = await cdp.send('Page.getInstallabilityErrors');
    check(!inst.installabilityErrors.length, 'instalable desde /colorinche/' + (inst.installabilityErrors.length ? ': ' + JSON.stringify(inst.installabilityErrors) : ''));
    let r = await page.goto(srv.url + 'otro/'); await page.waitForTimeout(400);
    let i = await pageInfo(page);
    const ctl = await page.evaluate(() => !!navigator.serviceWorker.controller);
    check(!i.app && !ctl && i.bg === 'rgb(255, 0, 0)', `/otro/ (fuera del alcance) → "${i.title}", controlada por el SW: ${ctl}`);
    r = await page.goto(srv.url + 'colorinche/viejo/enlace'); await page.waitForTimeout(700);
    i = await pageInfo(page);
    check(i.app && i.path === '/colorinche/index.html', `/colorinche/viejo/enlace (404) → la app (${i.path})`);
    await srv.stop();
    await context.setOffline(true);
    await page.goto(srv.url + 'colorinche/index.html#pizarra'); await page.waitForTimeout(1200);
    const scr = await page.evaluate(() => document.body.dataset.screen);
    check(scr === 'pizarra', `sin internet /colorinche/index.html#pizarra → pantalla "${scr}"`);
    await shot(page, 'pwa/origen-B-offline-pizarra');
  } catch (e) {
    check(false, 'excepción: ' + (e.stack || e));
  } finally {
    reportErrors(t, e404);
    await t.close(); await srv.stop();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
console.log(fails ? `\n${fails} FALLAS` : '\nTodo OK');
process.exit(fails ? 1 : 0);
