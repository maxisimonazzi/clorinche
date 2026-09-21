// Revisión (rv): fugas de URLs de blob y listeners al entrar/salir, abrir vistas (incluida colorear en capas) y descargar.
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { launch, appUrl } from '../../lib.mjs';
import { ok, clean, instrument } from './r1-lib.mjs';
const BASE = path.join(os.tmpdir(), 'colorinche-rv-profile');
const PROF = BASE + '-c1-fugas';
fs.rmSync(PROF, { recursive: true, force: true });
fs.cpSync(BASE, PROF, { recursive: true });
const t = await launch({ size: 'desktop', persistent: PROF });
const { page } = t;
await page.addInitScript(instrument);
await page.goto(appUrl('inicio'));
await page.waitForTimeout(1500);
const snap = () => page.evaluate(() => ({ urls: window.__liveUrls(), l: window.__listeners() }));
const s0 = await snap();
for (let i = 0; i < 5; i++) {
  await page.evaluate(() => CL.router.go('obras'));
  await page.waitForTimeout(1200);
  for (let k = 0; k < 4; k++) {
    await page.locator('.gal-card').nth(k).click();
    await page.waitForTimeout(k === 0 ? 1500 : 700);
    if (k === 1) { await page.locator('.gv-down').click(); await page.waitForTimeout(800); }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
  // salir con la vista abierta (casita no se ve: usar el router como el botón atrás)
  await page.locator('.gal-card').nth(3).click();
  await page.waitForTimeout(300);
  await page.evaluate(() => history.go(-2));
  await page.waitForTimeout(1500);
}
await page.waitForTimeout(5000);
const s1 = await snap();
const diff = {};
for (const k of new Set([...Object.keys(s0.l), ...Object.keys(s1.l)])) if ((s1.l[k] || 0) !== (s0.l[k] || 0)) diff[k] = (s1.l[k] || 0) - (s0.l[k] || 0);
console.log('hash', await page.evaluate(() => location.hash), 'urls', s0.urls, '→', s1.urls, 'listeners Δ', JSON.stringify(diff), 'modales', await page.evaluate(() => document.querySelectorAll('.modal-back').length));
ok(s1.urls <= s0.urls + 1, 'URLs de blob no se acumulan');
ok(clean(t.errors).length === 0, 'sin errores ' + JSON.stringify(clean(t.errors)).slice(0, 300));
await t.close();
