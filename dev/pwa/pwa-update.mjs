// Colorinche — prueba de ACTUALIZACIÓN del service worker (sobre una copia temporal de app/):
//  v1 instalada → cambia un archivo → build-sw.mjs genera versión nueva → al abrir de nuevo, el SW nuevo
//  se instala, se activa solo (skipWaiting + clients.claim), borra la caché vieja y la próxima apertura
//  ya usa el archivo nuevo, también sin internet.
// Uso: cd dev && node pwa/pwa-update.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { launch, APP, DEV } from '../lib.mjs';
import { startServer, swState } from './helpers.mjs';

const PORT = 8792;
let fails = 0;
const check = (ok, msg) => { console.log((ok ? '  ok   ' : '  FALLA ') + msg); if (!ok) fails++; };
const build = (dir) => spawnSync(process.execPath, [path.join(DEV, 'build-sw.mjs'), '--app', dir], { encoding: 'utf8' }).stdout.trim();

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'colorinche-upd-'));
const copy = path.join(tmp, 'app');
fs.cpSync(APP, copy, { recursive: true });
console.log('v1:', build(copy));

const profile = path.join(tmp, 'perfil');
let srv = await startServer(PORT, copy);
const t = await launch({ size: 'tablet', persistent: profile });
const { page, context } = t;
try {
  await page.goto(srv.url + 'index.html');
  const v1 = await swState(page);
  check(v1.cached === v1.expected, `v1 instalada: ${v1.cache} (${v1.cached} archivos)`);

  // Cambio en la app + nueva versión del SW.
  fs.appendFileSync(path.join(copy, 'css', 'core.css'), '\n/* marca-actualizacion */\n');
  console.log('v2:', build(copy));

  // Reabrir: el navegador compara sw.js, instala la v2 y la activa sola.
  await page.reload();
  await page.waitForTimeout(500);
  const v2 = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg.update().catch(() => {});
    const t0 = Date.now();
    while (Date.now() - t0 < 20000) {
      const names = (await caches.keys()).filter((n) => n.startsWith('colorinche'));
      if (names.length === 1 && reg.active && reg.active.state === 'activated' && !reg.installing && !reg.waiting) {
        const src = await (await fetch('sw.js', { cache: 'no-store' })).text();
        if (names[0] === 'colorinche|' + reg.scope + '|' + src.match(/const VERSION = '([^']+)'/)[1]) return { names, ok: true };
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    return { names: await caches.keys(), ok: false };
  });
  check(v2.ok && v2.names[0] !== v1.cache, `v2 activa sola y la caché vieja se borró: ${v2.names.join(', ')}`);

  // Próxima apertura, sin internet: usa el archivo nuevo desde la caché.
  await srv.stop();
  await context.setOffline(true);
  await page.goto(srv.url + 'index.html#inicio');
  await page.waitForTimeout(800);
  const css = await page.evaluate(async () => (await (await fetch('css/core.css')).text()).includes('marca-actualizacion'));
  check(css, 'offline, la próxima apertura sirve el core.css nuevo');
  const ok = await page.evaluate(() => document.body.dataset.screen === 'inicio' && !!navigator.serviceWorker.controller);
  check(ok, 'la app abre controlada por el SW nuevo');
} catch (e) {
  check(false, 'excepción: ' + (e.stack || e));
} finally {
  if (t.errors.length) console.log('  errores de consola:', t.errors);
  await t.close();
  await srv.stop();
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(fails ? `\n${fails} FALLAS` : '\nTodo OK');
process.exit(fails ? 1 : 0);
