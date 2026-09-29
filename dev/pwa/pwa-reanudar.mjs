// Colorines — app instalada que se "reanuda" desde recientes (sin recargar la página): ¿se entera de una
// versión nueva? El navegador sólo busca sw.js al CARGAR la página, no en cambios de #ruta ni al volver de
// segundo plano. Esta prueba mide las dos situaciones sobre una copia temporal de app/:
//   1. tal como está hoy el núcleo → se espera que NO detecte la versión nueva (documentado);
//   2. con el arreglo propuesto para main.js (PEDIDO AL NÚCLEO, inyectado acá con addInitScript):
//        al volver a primer plano → registration.update() (máx. 1 vez por hora; acá sin límite para probar)
//        y cuando la versión nueva toma el control → recargar recién al estar en #inicio (no se pierde nada).
// Uso: cd dev && node pwa/pwa-reanudar.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launch, shot, APP } from '../lib.mjs';
import { startServer, swState } from './helpers.mjs';
import { buildSw } from '../build-sw.mjs';

let fails = 0;
const check = (ok, msg) => { console.log((ok ? '  ok   ' : '  FALLA ') + msg); if (!ok) fails++; };
const build = (dir) => { const r = buildSw(dir); if (!r.upToDate) fs.writeFileSync(r.sw, r.next); return r.version; };

// Arreglo propuesto para app/js/main.js (dentro del if de serviceWorker). HORA = 36e5 en la app real.
export const PROPUESTA = (HORA) => `
window.addEventListener('load', () => {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  const CL = window.CL;
  let ultima = Date.now(), nueva = false;
  const hadController = !!navigator.serviceWorker.controller;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || Date.now() - ultima < ${HORA}) return;
    ultima = Date.now();
    navigator.serviceWorker.getRegistration().then((r) => r && r.update()).catch(() => {});
  });
  const recargarSiSePuede = () => {
    if (nueva && CL.router.current && CL.router.current.name === 'inicio') location.reload();
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return; // primera instalación: no es una actualización
    nueva = true;
    recargarSiSePuede();
  });
  CL.router.events.on('change', recargarSiSePuede);
});`;

async function escenario(nombre, conArreglo, port) {
  console.log(`\n=== ${nombre} ===`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'colorines-rea-'));
  const copy = path.join(tmp, 'app');
  fs.cpSync(APP, copy, { recursive: true });
  const v1 = build(copy);
  const srv = await startServer(port, copy);
  const t = await launch({ size: 'tablet', persistent: path.join(tmp, 'perfil') });
  const { page } = t;
  if (conArreglo) await page.addInitScript(PROPUESTA(0));
  const res = {};
  try {
    await page.goto(srv.url + 'index.html#inicio');
    await swState(page);
    // Cada carga de página programa una búsqueda de sw.js nuevo con un poco de demora: se la deja pasar
    // ANTES de publicar la v2, para medir sólo lo que pasa después con la app abierta.
    await page.reload(); await page.waitForTimeout(5000);
    const antes = srv.log.join('').split('\n').filter((l) => /sw\.js/.test(l)).length;
    await page.evaluate(() => { window.__sinRecargar = true; }); // marca: desaparece si la página se recarga
    // Se publica la v2.
    fs.appendFileSync(path.join(copy, 'css', 'core.css'), '\n/* marca-v2 */\n');
    const v2 = build(copy);
    // El chico sigue usando la app abierta: está en la pizarra, la app va a segundo plano y vuelve.
    await page.evaluate(() => { location.hash = 'pizarra'; });
    await page.waitForTimeout(800);
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForTimeout(4000);
    res.cachesPizarra = await page.evaluate(async () => (await caches.keys()).join(','));
    res.sigueEnPizarra = await page.evaluate(() => window.__sinRecargar === true && document.body.dataset.screen === 'pizarra');
    // Vuelve al inicio.
    await page.evaluate(() => { location.hash = 'inicio'; });
    await page.waitForTimeout(2500);
    res.recargo = await page.evaluate(() => window.__sinRecargar !== true);
    // Lo que sirve ahora la caché a esta página (la v1 no tiene la marca).
    res.cssNuevo = await page.evaluate(() => fetch('css/core.css').then((r) => r.text()).then((t) => t.includes('marca-v2')));
    res.pantalla = await page.evaluate(() => document.body.dataset.screen);
    await shot(page, `pwa/reanudar-${conArreglo ? 'con' : 'sin'}-arreglo`);
    res.v1 = v1; res.v2 = v2;
    // Pedidos de sw.js que hizo el navegador con la app ya abierta (después de publicar la v2).
    res.pedidosSw = srv.log.join('').split('\n').filter((l) => /sw\.js/.test(l)).length - antes;
  } catch (e) {
    check(false, 'excepción: ' + (e.stack || e));
  } finally {
    res.errors = t.errors.slice();
    await t.close(); await srv.stop();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return res;
}

const sin = await escenario('1. núcleo actual (sin arreglo)', false, 8795);
console.log('  ', JSON.stringify(sin));
check(/^colorines\|[^,]*\|/.test(sin.cachesPizarra) && sin.cachesPizarra.endsWith('|' + sin.v1) && !sin.cachesPizarra.includes(',') && !sin.recargo,
  `sin arreglo la app reanudada sigue en la v1 (${sin.cachesPizarra}; pedidos de sw.js: ${sin.pedidosSw}) — limitación conocida, ver pedido al núcleo`);

const con = await escenario('2. con el arreglo propuesto para main.js', true, 8796);
console.log('  ', JSON.stringify(con));
check(con.cachesPizarra.endsWith('|' + con.v2) && !con.cachesPizarra.includes(','), `al volver a primer plano se instala y activa la v2 (${con.cachesPizarra})`);
check(con.sigueEnPizarra, 'mientras está en la pizarra NO recarga (no se interrumpe al chico)');
check(con.recargo && con.pantalla === 'inicio' && con.cssNuevo, `al volver al inicio recarga sola y ya usa la v2 (css nuevo: ${con.cssNuevo})`);
for (const r of [sin, con]) if (r.errors.length) console.log('  errores de consola:', r.errors);
console.log(fails ? `\n${fails} FALLAS` : '\nTodo OK');
process.exit(fails ? 1 : 0);
