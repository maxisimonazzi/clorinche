// Colorinche — utilidades de las pruebas PWA: levantar/cortar dev/serve.mjs y leer el estado del SW.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { DEV } from '../lib.mjs';

/** Arranca dev/serve.mjs en `port` (opcional: otra carpeta raíz). Resuelve cuando ya escucha. */
export function startServer(port, root = null) {
  return new Promise((resolve, reject) => {
    const args = [path.join(DEV, 'serve.mjs'), String(port)];
    if (root) args.push('--root', root);
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const log = [];
    let ok = false;
    child.stdout.on('data', (d) => {
      log.push(String(d));
      if (!ok && /Colorinche en http/.test(String(d))) { ok = true; resolve(srv); }
    });
    child.stderr.on('data', (d) => log.push(String(d)));
    child.on('exit', (code) => { if (!ok) reject(new Error('serve.mjs salió con ' + code + '\n' + log.join(''))); });
    const srv = {
      url: `http://localhost:${port}/`,
      log,
      stop: () => new Promise((r) => { if (child.exitCode != null || child.signalCode != null) return r(); child.once('exit', r); child.kill(); }),
    };
  });
}

/**
 * Espera a que el SW esté activo y la caché completa.
 * Devuelve { version, files, cacheNames, cache, cached, expected, state, scope, controlled }.
 * La caché de la app se llama 'colorinche|<alcance>|<versión>' (ver app/sw.js).
 */
export async function swState(page, timeout = 20000) {
  return page.evaluate(async (timeout) => {
    const t0 = Date.now();
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, rej) => setTimeout(() => rej(new Error('SW no quedó listo')), timeout)),
    ]);
    // La versión y la lista salen del propio sw.js (misma fuente que usa el SW).
    const src = await (await fetch('sw.js', { cache: 'no-store' })).text().catch(() => '');
    const version = (src.match(/const VERSION = '([^']+)'/) || [])[1];
    const files = (src.match(/const FILES = \[([\s\S]*?)\];/) || ['', ''])[1].split(',')
      .map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
    const expected = files.length;
    let names = [], cached = 0;
    while (Date.now() - t0 < timeout) {
      names = await caches.keys();
      const mine = names.find((n) => n === 'colorinche|' + reg.scope + '|' + version);
      cached = mine ? (await (await caches.open(mine)).keys()).length : 0;
      if (cached >= expected && reg.active && reg.active.state === 'activated') break;
      await new Promise((r) => setTimeout(r, 200));
    }
    return {
      version, files, cacheNames: names, cache: 'colorinche|' + reg.scope + '|' + version, cached, expected,
      state: reg.active && reg.active.state, scope: reg.scope,
      controlled: !!navigator.serviceWorker.controller,
    };
  }, timeout);
}
