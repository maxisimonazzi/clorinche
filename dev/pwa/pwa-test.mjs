// Colorines — prueba de la PWA servida por http://localhost:
//  1. el service worker se registra, se activa y termina el precache (todos los archivos de sw.js);
//  2. el manifest es válido y la página es instalable (CDP: Page.getAppManifest / getInstallabilityErrors);
//  3. sin internet (servidor apagado + context.setOffline) la app abre y navega:
//     inicio, #dibujos, #pizarra, #fuegos, #obras (+ "/" y "index.html?x=1" → index de la caché).
// Capturas en dev/shots/pwa/<tamaño>-offline-<ruta>.png
//
// Uso: cd dev && node pwa/pwa-test.mjs [tamaños separados por coma]   (por defecto desktop,tablet,phone)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { launch, shot, DEV } from '../lib.mjs';
import { startServer, swState } from './helpers.mjs';

const PORT = 8790;
const STRICT = process.argv.includes('--strict'); // pantallas no registradas = falla (usar al integrar)
const sizes = (process.argv.slice(2).find((a) => !a.startsWith('--')) || 'desktop,tablet,phone').split(',');
const routes = ['inicio', 'dibujos', 'pizarra', 'fuegos', 'obras'];
let fails = 0, pending = 0;

// ¿sw.js está al día con los archivos de app/? (si no, hay que correr node build-sw.mjs)
{
  const r = spawnSync(process.execPath, [path.join(DEV, 'build-sw.mjs'), '--check'], { encoding: 'utf8' });
  if (r.status === 0) console.log(r.stdout.trim());
  else { console.log('  AVISO ' + (r.stderr || r.stdout).trim()); if (STRICT) fails++; }
}
const check = (ok, msg) => { console.log((ok ? '  ok   ' : '  FALLA ') + msg); if (!ok) fails++; };

for (const size of sizes) {
  console.log(`\n=== ${size} ===`);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'colorines-pwa-'));
  let srv = await startServer(PORT);
  const t = await launch({ size, persistent: profile });
  const { page, context } = t;
  try {
    // --- 1. En línea: registro y precache ---
    await page.goto(srv.url + 'index.html');
    let st = await swState(page);
    check(st.state === 'activated', `SW activo (${st.state}), alcance ${st.scope}`);
    check(st.cached === st.expected && st.expected > 20, `precache completo: ${st.cached}/${st.expected} archivos en "${st.cache}"`);
    check(st.cacheNames.filter((n) => n.startsWith('colorines')).length === 1 && st.cacheNames.includes(st.cache), 'una sola caché de la app: ' + st.cacheNames.join(', '));
    await page.reload();
    await page.waitForTimeout(500);
    st = await swState(page);
    check(st.controlled, 'la página quedó controlada por el SW');

    // --- 2. Manifest e instalabilidad (una vez alcanza) ---
    if (size === sizes[0]) {
      const cdp = await context.newCDPSession(page);
      const man = await cdp.send('Page.getAppManifest');
      check(man.url && man.url.endsWith('/manifest.webmanifest'), 'manifest enlazado: ' + man.url);
      check(!man.errors.length, 'manifest sin errores' + (man.errors.length ? ': ' + JSON.stringify(man.errors) : ''));
      const data = JSON.parse(man.data);
      check(data.name === 'Colorines' && data.lang === 'es' && data.start_url === './index.html', 'name/lang/start_url correctos');
      const inst = await cdp.send('Page.getInstallabilityErrors');
      check(!inst.installabilityErrors.length, 'instalable' + (inst.installabilityErrors.length ? ': ' + JSON.stringify(inst.installabilityErrors) : ' (sin errores de instalabilidad)'));
      // Íconos del manifest: existen, tipo correcto y tamaño real.
      const icons = await page.evaluate(async (list) => Promise.all(list.map(async (ic) => {
        const r = await fetch(ic.src);
        const blob = await r.blob();
        let real = 'any';
        if (ic.type === 'image/png') { const b = await createImageBitmap(blob); real = b.width + 'x' + b.height; }
        return { src: ic.src, ok: r.ok, type: r.headers.get('content-type'), sizes: ic.sizes, real, purpose: ic.purpose };
      })), data.icons);
      for (const ic of icons) check(ic.ok && ic.type.startsWith(ic.src.endsWith('.svg') ? 'image/svg+xml' : 'image/png') && ic.real === ic.sizes, `ícono ${ic.src} ${ic.real} ${ic.purpose} (${ic.type})`);
      const apple = await page.evaluate(async () => {
        const b = await createImageBitmap(await (await fetch('icons/apple-touch-icon.png')).blob());
        const c = new OffscreenCanvas(b.width, b.height); const g = c.getContext('2d'); g.drawImage(b, 0, 0);
        const d = g.getImageData(0, 0, b.width, b.height).data; let transp = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] < 255) transp++;
        return { w: b.width, h: b.height, transp };
      });
      check(apple.w === 180 && apple.h === 180 && apple.transp === 0, `apple-touch-icon ${apple.w}x${apple.h}, píxeles transparentes: ${apple.transp}`);
      const mime = await page.evaluate(async () => (await fetch('manifest.webmanifest', { cache: 'no-store' })).headers.get('content-type'));
      check(/application\/manifest\+json/.test(mime), 'MIME del manifest: ' + mime);
    }

    // --- 3. Sin internet ---
    const files = st.files;
    await srv.stop();
    await context.setOffline(true);
    const errBefore = t.errors.length;
    await page.goto(srv.url + 'index.html');
    await page.waitForTimeout(900);
    // Cada archivo de la app se puede pedir sin internet (lo sirve el SW desde la caché).
    const offFiles = await page.evaluate(async (files) => {
      const bad = [];
      for (const f of files) {
        try { const r = await fetch(f); if (!r.ok || !(await r.blob()).size) bad.push(f + ' ' + r.status); } catch (e) { bad.push(f + ' ' + e.message); }
      }
      return bad;
    }, files);
    check(!offFiles.length, `offline: los ${files.length} archivos de la app responden desde la caché` + (offFiles.length ? ': ' + offFiles.join(', ') : ''));
    for (const r of routes) {
      await page.evaluate((r) => { location.hash = r; }, r);
      await page.waitForTimeout(1100);
      const info = await page.evaluate(() => ({
        screen: document.body.dataset.screen,
        kids: document.querySelector('#app .screen') ? document.querySelector('#app .screen').children.length : 0,
        font: document.fonts.check('20px Fredoka'),
      }));
      if (info.screen !== r && info.screen === 'inicio' && !STRICT) {
        // El router cae a "inicio" si la pantalla no está registrada: módulo de otro agente todavía en construcción.
        console.log(`  PEND  offline #${r}: la pantalla todavía no está registrada (módulo en construcción) → muestra inicio`);
        pending++;
      } else {
        check(info.screen === r && info.kids > 0, `offline #${r}: pantalla "${info.screen}", ${info.kids} elementos, fuente Fredoka ${info.font ? 'cargada' : 'NO'}`);
      }
      await shot(page, `pwa/${size}-offline-${r}`);
    }
    // Tocar las tarjetas del inicio sin internet: cada una navega a su pantalla.
    await page.evaluate(() => { location.hash = 'inicio'; });
    await page.waitForSelector('.home-card', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(300);
    const cards = await page.locator('.home-card').count();
    const goes = [];
    for (let i = 0; i < cards; i++) {
      await page.locator('.home-card').nth(i).click();
      await page.waitForTimeout(500);
      goes.push(await page.evaluate(() => location.hash));
      await page.evaluate(() => { location.hash = 'inicio'; });
      await page.waitForSelector('.home-card', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
    check(cards > 0 && goes.every((h) => h && h !== '#inicio'), `offline: las ${cards} tarjetas del inicio navegan (${goes.join(' ')})`);
    // Navegaciones "raras" sin internet: raíz y con querystring → index.html de la caché.
    for (const u of ['', 'index.html?utm=x#dibujos', 'otra/ruta/inexistente']) {
      const resp = await page.goto(srv.url + u);
      await page.waitForTimeout(600);
      const ok = await page.evaluate(() => !!(window.CL && CL.router && document.querySelector('#app .screen')));
      check(resp && resp.ok() && ok, `offline navegar a "/${u}" → app (${resp && resp.status()})`);
    }
    const offErr = t.errors.slice(errBefore);
    check(!offErr.length, 'sin errores de consola offline' + (offErr.length ? ':\n     ' + offErr.join('\n     ') : ''));
  } catch (e) {
    check(false, 'excepción: ' + (e.stack || e));
  } finally {
    if (t.errors.length) console.log('  errores de consola:', t.errors);
    await t.close();
    await srv.stop();
    fs.rmSync(profile, { recursive: true, force: true });
  }
}
console.log((fails ? `\n${fails} FALLAS` : '\nTodo OK') +
  (pending ? ` (${pending} pantallas pendientes de otros módulos; correr con --strict al integrar)` : ''));
process.exit(fails ? 1 : 0);
