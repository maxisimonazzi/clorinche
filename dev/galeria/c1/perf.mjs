// Revisión (rv): fluidez — entrar a la galería, abrir la vista de una obra real grande y scrollear.
// Mide el hueco máximo entre frames (rAF) y los fps. Uso: cd dev && node review-galeria/rv-perf.mjs [tamaño=tablet]
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { launch, appUrl } from '../../lib.mjs';
import { ok, clean } from './r1-lib.mjs';

const size = process.argv[2] || 'tablet';
const BASE = path.join(os.tmpdir(), 'colorinche-rv-profile');
const PROF = BASE + '-c1-perf-' + size;
fs.rmSync(PROF, { recursive: true, force: true });
fs.cpSync(BASE, PROF, { recursive: true });
const t = await launch({ size, persistent: PROF });
const { page } = t;
await page.goto(appUrl('inicio'));
await page.waitForTimeout(1500);
const meter = () => page.evaluate(() => {
  window.__fr = { gaps: [], last: performance.now(), on: true };
  const f = (now) => { const F = window.__fr; if (!F.on) return; F.gaps.push(now - F.last); F.last = now; requestAnimationFrame(f); };
  requestAnimationFrame(f);
});
const read = () => page.evaluate(() => {
  const F = window.__fr; F.on = false;
  const g = F.gaps.slice(1); const tot = g.reduce((a, b) => a + b, 0);
  return { fps: Math.round(g.length / (tot / 1000)), maxGap: Math.round(Math.max(...g)), over50: g.filter((x) => x > 50).length };
});
// Entrar a la galería
await meter();
await page.evaluate(() => CL.router.go('obras'));
await page.waitForTimeout(2000);
const a = await read();
console.log('entrar a la galería', JSON.stringify(a));
// Abrir la vista de la vaca real (2048)
const id = await page.evaluate(async () => (await CL.db.works.list()).find((w) => w.kind === 'colorear' && w.w === 2048 && w.status === 'done').id);
await meter();
await page.locator(`.gal-card[data-id="${id}"]`).click();
await page.waitForTimeout(2000);
const b = await read();
console.log('abrir vista colorear 2048', JSON.stringify(b));
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
// Descargar (arma el PNG a 2048)
await meter();
await page.locator(`.gal-card[data-id="${id}"]`).click();
await page.waitForTimeout(900);
await page.locator('.gv-down').click();
await page.waitForTimeout(2500);
const c = await read();
console.log('descargar colorear 2048', JSON.stringify(c));
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
// Scroll de la grilla
await meter();
for (let i = 0; i < 20; i++) { await page.mouse.wheel(0, 60); await page.waitForTimeout(40); }
await page.waitForTimeout(500);
const d = await read();
console.log('scroll grilla', JSON.stringify(d));
ok(a.maxGap < 250 && b.maxGap < 250 && d.fps >= 40, 'sin trabones grandes');
ok(clean(t.errors).length === 0, 'sin errores');
await t.close();
