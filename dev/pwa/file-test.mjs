// Colorinche — abrir por file:// (doble clic en index.html): sin manifest ni service worker, sin errores,
// y los íconos del <head> existen. Uso: cd dev && node pwa/file-test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { launch, appUrl, shot, APP } from '../lib.mjs';

let fails = 0;
const check = (ok, msg) => { console.log((ok ? '  ok   ' : '  FALLA ') + msg); if (!ok) fails++; };
const t = await launch({ size: 'desktop' });
await t.page.goto(appUrl('inicio'));
await t.page.waitForTimeout(1200);
const info = await t.page.evaluate(() => ({
  manifest: !!document.querySelector('link[rel=manifest]'),
  sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
  icons: [...document.querySelectorAll('link[rel~=icon], link[rel=apple-touch-icon]')].map((l) => l.getAttribute('href')),
  screen: document.body.dataset.screen,
}));
check(!info.manifest, 'en file:// no se enlaza el manifest');
check(!info.sw, 'en file:// no hay service worker');
for (const h of info.icons) check(fs.existsSync(path.join(APP, h)), 'existe ' + h);
check(info.screen === 'inicio', 'la app abre en inicio');
await shot(t.page, 'pwa/file-inicio');
check(!t.errors.length, 'sin errores de consola' + (t.errors.length ? ': ' + t.errors.join(' | ') : ''));
await t.close();
console.log(fails ? `\n${fails} FALLAS` : '\nTodo OK');
process.exit(fails ? 1 : 0);
