// Colorines — pruebas del service worker frente a hostings y situaciones "reales" (revisión 2 de QA):
//  A. Hosting que redirige /index.html → / (Cloudflare Pages, Vercel/Firebase con cleanUrls, Netlify con reglas):
//     la app abre en la 1.ª visita, en las siguientes y sin internet ("/", "index.html", "index.html#pizarra").
//  B. Dispositivo "trabado" por el sw.js anterior en ese hosting: al publicar el sw.js nuevo se recupera
//     (con y sin internet) y la caché vieja se borra.
//  C. Dos copias en el mismo origen (/colorines/ y /colorines-prueba/): ninguna borra la caché de la otra,
//     ni siquiera al actualizarse; una caché con el nombre viejo sólo la borra su propia copia.
//  D. Auto-reparación: si falta un archivo propio en la caché, se vuelve a guardar al pedirlo con internet.
//  E. Un archivo con '#' y espacio en el nombre ('icons/foto #1.png') no rompe la instalación y anda offline.
//  F. Puerto reusado: Colorines en la raíz de localhost y después OTRO proyecto en el mismo puerto: al ver que
//     sw.js ya no existe, el SW se da de baja solo (la dirección muestra el otro proyecto) sin borrar las obras.
// Capturas en dev/shots/pwa/hosting-*.png
//
// Uso: cd dev && node pwa/pwa-hosting.mjs [partes, p. ej. AF]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import { launch, shot, APP, DEV } from '../lib.mjs';
import { startServer, swState } from './helpers.mjs';
import { buildSw } from '../build-sw.mjs';

let fails = 0;
// Sólo algunas partes: node pwa/pwa-hosting.mjs AC
const ONLY = (process.argv[2] || '').toUpperCase();
const run = (k) => !ONLY || ONLY.includes(k);
const check = (ok, msg) => { console.log((ok ? '  ok   ' : '  FALLA ') + msg); if (!ok) fails++; };
const LEGACY_SW = fs.readFileSync(path.join(DEV, 'pwa', 'sw-legado.js'), 'utf8');
const NEW_SW = fs.readFileSync(path.join(APP, 'sw.js'), 'utf8');
const tmps = [];

/** Copia app/ a `dir` con el sw.js elegido ('nuevo' | 'legado') y lo regenera. Devuelve la versión. */
function copyApp(dir, which = 'nuevo', extra = null) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.cpSync(APP, dir, { recursive: true });
  if (extra) extra(dir);
  syntaxCheck(dir);
  return setSw(dir, which);
}
/** Otros agentes editan app/ en paralelo: avisa si la copia agarró algún .js a medio escribir. */
function syntaxCheck(dir, sub = 'js') {
  for (const ent of fs.readdirSync(path.join(dir, sub), { withFileTypes: true })) {
    const rel = sub + '/' + ent.name;
    if (ent.isDirectory()) syntaxCheck(dir, rel);
    else if (ent.name.endsWith('.js')) {
      try { new vm.Script(fs.readFileSync(path.join(dir, rel), 'utf8'), { filename: rel }); } catch (e) {
        console.log(`  AVISO la copia tiene ${rel} con error de sintaxis (archivo de otro agente en edición): ${e.message}`);
      }
    }
  }
}
function setSw(dir, which) {
  fs.writeFileSync(path.join(dir, 'sw.js'), which === 'legado' ? LEGACY_SW : NEW_SW);
  const r = buildSw(dir);
  fs.writeFileSync(r.sw, r.next);
  return r.version;
}
const mkTmp = (p) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), p)); tmps.push(d); return d; };

/** Abre `url` y dice si la app arrancó de verdad. */
async function open(page, url, wait = 900) {
  // Siempre una apertura completa (no sólo un cambio de #ruta). Reintento: una página de error del navegador
  // puede recargarse sola (auto-reload de Chromium) e interrumpir esta navegación.
  for (let k = 0; k < 3; k++) {
    if (await page.goto('about:blank').then(() => true, () => false)) break;
    await page.waitForTimeout(500);
  }
  const r = await page.goto(url).catch((e) => ({ ok: () => false, status: () => e.message.split('\n')[0] }));
  await page.waitForTimeout(wait);
  const app = await page.evaluate(() => !!(window.CL && CL.router && document.querySelector('#app .screen'))).catch(() => false);
  return { ok: r.ok() && app, status: r.status(), app };
}

/** Espera (con la página abierta en la copia) a que el SW active la versión `version`. */
async function waitVersion(page, version, timeout = 20000) {
  return page.evaluate(async ({ version, timeout }) => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) await reg.update().catch(() => {});
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const r = await navigator.serviceWorker.getRegistration();
      const names = await caches.keys();
      if (r && r.active && r.active.state === 'activated' && !r.installing && !r.waiting &&
        names.some((n) => n.endsWith('|' + version))) return { ok: true, names };
      await new Promise((res) => setTimeout(res, 250));
    }
    return { ok: false, names: await caches.keys() };
  }, { version, timeout });
}

/** Proxy delante de serve.mjs que imita las "URLs lindas": *.html → 301 sin la extensión (index.html → carpeta). */
function prettyProxy(port, back) {
  const log = [];
  const proxy = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (/\.html$/.test(u.pathname)) {
      const to = u.pathname.replace(/index\.html$/, '').replace(/\.html$/, '') + u.search;
      log.push(`301 ${req.url} → ${to}`);
      res.writeHead(301, { Location: to }).end();
      return;
    }
    const p = http.request({ host: '127.0.0.1', port: back, path: req.url, method: req.method, headers: req.headers },
      (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    p.on('error', () => res.writeHead(502).end());
    req.pipe(p);
  });
  return new Promise((r) => proxy.listen(port, '127.0.0.1', () => r({ proxy, log, url: `http://localhost:${port}/` })));
}

try {
  // ---------------------------------------------------------------- A. hosting que redirige
  console.log('\n=== A. hosting que redirige /index.html → / (sw.js nuevo) ===');
  if (run('A')) {
    const tmp = mkTmp('colorines-hA-');
    const app = path.join(tmp, 'app');
    copyApp(app);
    const srv = await startServer(8871, app);
    const px = await prettyProxy(8872, 8871);
    const profile = mkTmp('colorines-hAp-');
    let t = await launch({ size: 'tablet', persistent: profile });
    try {
      let o = await open(t.page, px.url);
      check(o.ok, `1.ª visita a "/" abre la app (${o.status})`);
      const st = await swState(t.page);
      check(st.state === 'activated' && st.cached === st.expected, `SW activo y precache completo: ${st.cached}/${st.expected} en "${st.cache}"`);
      const idx = await t.page.evaluate(async (name) => {
        const res = await (await caches.open(name)).match('index.html');
        return res && { redirected: res.redirected, status: res.status, type: res.type, len: (await res.text()).length };
      }, st.cache);
      check(idx && !idx.redirected && idx.status === 200 && idx.len > 500, 'index.html guardado "limpio" (sin marca de redirección): ' + JSON.stringify(idx));
      check(px.log.some((l) => l.startsWith('301 /index.html')), 'el hosting efectivamente redirigió: ' + px.log.slice(0, 2).join(' | '));
      const cdp = await t.context.newCDPSession(t.page);
      const inst = await cdp.send('Page.getInstallabilityErrors');
      check(!inst.installabilityErrors.length, 'instalable: ' + JSON.stringify(inst.installabilityErrors));
      for (const u of ['', 'index.html', 'index.html#pizarra']) {
        o = await open(t.page, px.url + u);
        check(o.ok, `con internet (2.ª vez en adelante), "/${u}" → ${o.status} app=${o.app}`);
      }
      await shot(t.page, 'pwa/hosting-A-online-pizarra');
      await t.close();
      t = await launch({ size: 'tablet', persistent: profile });
      await t.context.setOffline(true);
      for (const u of ['', 'index.html', 'index.html#pizarra', 'index.html#dibujos']) {
        o = await open(t.page, px.url + u, 1200);
        check(o.ok, `SIN internet, "/${u}" → ${o.status} app=${o.app}`);
        if (u === '' || u === 'index.html#dibujos') await shot(t.page, `pwa/hosting-A-offline-${u ? 'dibujos' : 'raiz'}`);
      }
      const errs = t.errors.filter((e) => !/ERR_INTERNET_DISCONNECTED/.test(e));
      check(!errs.length, 'sin errores de consola offline' + (errs.length ? ': ' + errs.join(' | ') : ''));
    } finally {
      await t.close().catch(() => {});
      await srv.stop(); px.proxy.close();
    }
  }

  // ---------------------------------------------------------------- B. dispositivo trabado → se recupera
  console.log('\n=== B. dispositivo trabado por el sw.js anterior + publicar el nuevo ===');
  if (run('B')) {
    const tmp = mkTmp('colorines-hB-');
    const app = path.join(tmp, 'app');
    const vOld = copyApp(app, 'legado');
    const srv = await startServer(8873, app);
    const px = await prettyProxy(8874, 8873);
    const profile = mkTmp('colorines-hBp-');
    let t = await launch({ size: 'phone', persistent: profile });
    try {
      let o = await open(t.page, px.url);
      await t.page.evaluate(async (v) => {
        const t0 = Date.now();
        while (Date.now() - t0 < 20000) {
          const r = await navigator.serviceWorker.getRegistration();
          if (r && r.active && r.active.state === 'activated' && (await caches.keys()).includes('colorinche-' + v)) return;
          await new Promise((res) => setTimeout(res, 250));
        }
      }, vOld);
      o = await open(t.page, px.url);
      check(!o.ok, `(reproducción) con el sw.js anterior la 2.ª apertura falla: ${o.status}`);
      await shot(t.page, 'pwa/hosting-B-trabado');
      // Se publica el sw.js nuevo (misma app).
      const vNew = setSw(app, 'nuevo');
      let rec = { ok: false };
      for (let k = 0; k < 3 && !rec.ok; k++) {
        await t.page.goto(px.url).catch(() => {});
        await t.page.waitForTimeout(1500);
        rec = await waitVersion(t.page, vNew, 12000).catch(() => ({ ok: false }));
      }
      o = await open(t.page, px.url);
      check(o.ok, `con el sw.js nuevo publicado vuelve a abrir → ${o.status} app=${o.app}`);
      const names = await t.page.evaluate(() => caches.keys());
      check(names.length === 1 && names[0].endsWith('|' + vNew), 'la caché vieja (redirigida) se borró: ' + names.join(', '));
      await t.close();
      t = await launch({ size: 'phone', persistent: profile });
      await t.context.setOffline(true);
      for (const u of ['', 'index.html#obras']) {
        o = await open(t.page, px.url + u, 1200);
        check(o.ok, `recuperado, SIN internet "/${u}" → ${o.status} app=${o.app}`);
      }
      await shot(t.page, 'pwa/hosting-B-recuperado-offline');
    } finally {
      await t.close().catch(() => {});
      await srv.stop(); px.proxy.close();
    }
  }

  // ---------------------------------------------------------------- C/D/E. dos copias en el mismo origen
  console.log('\n=== C. dos copias en el mismo origen (+ D auto-reparación, E nombre con "#") ===');
  if (run('C')) {
    const tmp = mkTmp('colorines-hC-');
    const A = path.join(tmp, 'colorines'), B = path.join(tmp, 'colorines-prueba');
    const foto = (d) => fs.copyFileSync(path.join(d, 'icons', 'icon-192.png'), path.join(d, 'icons', 'foto #1.png'));
    const vA0 = copyApp(A, 'legado', foto); // A la instaló con la versión anterior
    let vB = copyApp(B, 'nuevo');
    const srv = await startServer(8875, tmp);
    const U = srv.url;
    const profile = mkTmp('colorines-hCp-');
    let t = await launch({ size: 'desktop', persistent: profile });
    try {
      await open(t.page, U + 'colorines/');
      await t.page.waitForTimeout(4000);
      let names = await t.page.evaluate(() => caches.keys());
      check(names.includes('colorinche-' + vA0), 'copia A instalada con el sw.js anterior: ' + names.join(', '));
      await open(t.page, U + 'colorines-prueba/');
      let st = await swState(t.page);
      names = st.cacheNames;
      check(st.cached === st.expected, `copia B instalada (sw.js nuevo): "${st.cache}"`);
      check(names.includes('colorinche-' + vA0), 'B NO borró la caché (con nombre viejo) de A: ' + names.join(', '));
      // A publica el sw.js nuevo.
      const vA = setSw(A, 'nuevo');
      await open(t.page, U + 'colorines/');
      const wa = await waitVersion(t.page, vA);
      names = await t.page.evaluate(() => caches.keys());
      check(wa.ok && !names.includes('colorinche-' + vA0) && names.length === 2,
        'A actualizada: borró SU caché vieja y dejó la de B: ' + names.join(', '));
      // B se actualiza (cambia un archivo): sólo cambia su propia caché.
      fs.appendFileSync(path.join(B, 'css', 'core.css'), '\n/* copia B v2 */\n');
      vB = setSw(B, 'nuevo');
      await open(t.page, U + 'colorines-prueba/');
      const wb = await waitVersion(t.page, vB);
      names = await t.page.evaluate(() => caches.keys());
      check(wb.ok && names.length === 2 && names.some((n) => n.includes('/colorines/|' + vA)) && names.some((n) => n.includes('/colorines-prueba/|' + vB)),
        'B actualizada: la caché de A sigue intacta: ' + names.join(', '));
      // D. auto-reparación: se borra un archivo de la caché de B y se lo pide con internet.
      const heal = await t.page.evaluate(async (v) => {
        const name = (await caches.keys()).find((n) => n.endsWith('|' + v));
        const c = await caches.open(name);
        const before = await c.delete('css/home.css');
        const r = await fetch('css/home.css');
        await new Promise((res) => setTimeout(res, 300));
        return { before, status: r.status, back: !!(await c.match('css/home.css')) };
      }, vB);
      check(heal.before && heal.status === 200 && heal.back, 'D. un archivo propio que faltaba en la caché se vuelve a guardar: ' + JSON.stringify(heal));
      // E. archivo con '#' y espacio en el nombre, en A.
      await open(t.page, U + 'colorines/');
      const e = await t.page.evaluate(async (v) => {
        const src = await (await fetch('sw.js', { cache: 'no-store' })).text();
        const entry = (src.match(/'icons\/foto[^']*'/) || [''])[0];
        const name = (await caches.keys()).find((n) => n.endsWith('|' + v));
        const hit = await (await caches.open(name)).match('icons/foto%20%231.png');
        return { entry, cached: !!hit, type: hit && hit.headers.get('content-type') };
      }, vA);
      check(e.entry === "'icons/foto%20%231.png'" && e.cached && e.type === 'image/png', 'E. "icons/foto #1.png" en la lista y en la caché: ' + JSON.stringify(e));
      await t.close();
      await srv.stop();
      // Sin internet (y sin servidor): las dos copias abren.
      t = await launch({ size: 'desktop', persistent: profile });
      await t.context.setOffline(true);
      for (const u of ['colorines/', 'colorines-prueba/', 'colorines/index.html#pizarra']) {
        const o = await open(t.page, U + u, 1200);
        check(o.ok, `SIN internet /${u} → ${o.status} app=${o.app}`);
        if (!u.includes('#')) await shot(t.page, `pwa/hosting-C-offline-${u.replace(/\//g, '')}`);
      }
      const img = await t.page.evaluate(async () => {
        const r = await fetch('icons/foto%20%231.png');
        const b = await createImageBitmap(await r.blob());
        return r.status + ' ' + b.width + 'x' + b.height;
      }).catch((err) => 'error ' + err.message);
      check(img === '200 192x192', 'E. sin internet, "icons/foto #1.png" se sirve desde la caché: ' + img);
      const errs = t.errors.filter((x) => !/ERR_INTERNET_DISCONNECTED/.test(x));
      check(!errs.length, 'sin errores de consola offline' + (errs.length ? ': ' + errs.join(' | ') : ''));
    } finally {
      await t.close().catch(() => {});
      await srv.stop();
    }
  }

  // ---------------------------------------------------------------- F. puerto reusado por otro proyecto
  console.log('\n=== F. el puerto se reusa para otro proyecto ===');
  if (run('F')) {
    const tmp = mkTmp('colorines-hF-');
    const app = path.join(tmp, 'app'), otro = path.join(tmp, 'otro');
    copyApp(app);
    fs.mkdirSync(path.join(otro, 'css'), { recursive: true });
    fs.writeFileSync(path.join(otro, 'index.html'), '<!doctype html><meta charset="utf-8"><title>Otro proyecto</title><link rel="stylesheet" href="css/core.css"><h1>Otro proyecto</h1>');
    fs.writeFileSync(path.join(otro, 'css', 'core.css'), 'h1{color:green;font:40px sans-serif}');
    let srv = await startServer(8876, app);
    const profile = mkTmp('colorines-hFp-');
    let t = await launch({ size: 'desktop', persistent: profile });
    try {
      await open(t.page, srv.url);
      await swState(t.page);
      await t.page.evaluate(() => CL.db.kv.set('prueba-puerto', 'sigue acá'));
      await t.close();
      await srv.stop();
      srv = await startServer(8876, otro);
      t = await launch({ size: 'desktop', persistent: profile });
      await t.page.goto(srv.url);
      await t.page.waitForTimeout(1500);
      const first = await t.page.title();
      console.log(`  1.ª apertura con el otro proyecto: "${first}" (puede ser Colorines una última vez)`);
      const titles = [];
      for (const u of ['', 'index.html']) {
        await t.page.goto('about:blank');
        await t.page.goto(srv.url + u);
        await t.page.waitForTimeout(800);
        titles.push(await t.page.title());
      }
      const st = await t.page.evaluate(async () => ({
        regs: (await navigator.serviceWorker.getRegistrations()).length,
        caches: await caches.keys(),
        css: getComputedStyle(document.querySelector('h1') || document.body).color,
        dbs: (await indexedDB.databases()).map((d) => d.name),
      }));
      check(titles.every((x) => x === 'Otro proyecto') && st.css === 'rgb(0, 128, 0)',
        `después, "/" e "index.html" muestran el otro proyecto (${titles.join(', ')}; css ${st.css})`);
      check(st.regs === 0 && !st.caches.some((n) => n.startsWith('colorines')), `el SW de Colorines se dio de baja y borró su caché: ${JSON.stringify({ regs: st.regs, caches: st.caches })}`);
      await shot(t.page, 'pwa/hosting-F-otro-proyecto');
      await t.close();
      await srv.stop();
      // Vuelve Colorines al puerto: se reinstala sola y los datos siguen ahí.
      srv = await startServer(8876, app);
      t = await launch({ size: 'desktop', persistent: profile });
      const o = await open(t.page, srv.url, 1200);
      await shot(t.page, 'pwa/hosting-F-colorines-de-vuelta');
      const kv = await t.page.evaluate(() => CL.db.kv.get('prueba-puerto')).catch((e) => 'error ' + e.message);
      const st2 = await swState(t.page).catch((e) => ({ error: e.message }));
      check(o.ok && kv === 'sigue acá' && st2.state === 'activated', `Colorines de vuelta: abre (${o.status}), se reinstala (${st2.state || st2.error}) y los datos guardados siguen (${kv})`);
    } finally {
      await t.close().catch(() => {});
      await srv.stop();
    }
  }
} catch (e) {
  check(false, 'excepción: ' + (e.stack || e));
} finally {
  for (const d of tmps) fs.rmSync(d, { recursive: true, force: true });
}
console.log(fails ? `\n${fails} FALLAS` : '\nTodo OK');
process.exit(fails ? 1 : 0);
