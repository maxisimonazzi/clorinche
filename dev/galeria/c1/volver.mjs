// Revisión (rv): abrir una obra de abajo de todo, Seguir, mirar sin cambiar nada y volver con "atrás".
// ¿Vuelve al mismo lugar de la grilla (scroll/pestaña)?
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { launch, appUrl, shot } from '../../lib.mjs';
import { ok, clean } from './r1-lib.mjs';
const size = process.argv[2] || 'phone';
const BASE = path.join(os.tmpdir(), 'colorinche-rv-profile');
const PROF = BASE + '-c1-volver';
fs.rmSync(PROF, { recursive: true, force: true });
fs.cpSync(BASE, PROF, { recursive: true });
const t = await launch({ size, persistent: PROF });
const { page } = t;
await page.goto(appUrl('inicio'));
await page.waitForTimeout(900);
await page.evaluate(() => CL.router.go('obras'));
await page.waitForTimeout(1400);
const id = await page.evaluate(async () => (await CL.db.works.list({ status: 'done' })).filter((w) => w.kind === 'pizarra').slice(-1)[0].id);
await page.locator(`.gal-card[data-id="${id}"]`).scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const top0 = await page.evaluate(() => document.querySelector('.gal-grid').scrollTop);
await page.locator(`.gal-card[data-id="${id}"]`).click();
await page.waitForTimeout(900);
await page.locator('.gv-go').click();
await page.waitForTimeout(2500);
const h = await page.evaluate(() => location.hash);
await page.evaluate(() => history.back());
await page.waitForTimeout(2000);
const r = await page.evaluate((id) => {
  const g = document.querySelector('.gal-grid'); const c = document.querySelector(`.gal-card[data-id="${id}"]`);
  const cr = c && c.getBoundingClientRect(), gr = g.getBoundingClientRect();
  return { top: g.scrollTop, visible: !!c && cr.top >= gr.top - 10 && cr.bottom <= gr.bottom + 10, first: document.querySelector('.gal-card').dataset.id === id };
}, id);
await shot(page, 'galeria/c1/volver-' + size);
console.log('seguir →', h, JSON.stringify({ top0, ...r }));
ok(r.visible, `al volver con "atrás" la obra que abrió sigue a la vista (scroll ${top0} → ${r.top}, primera: ${r.first})`);
ok(clean(t.errors).length === 0, 'sin errores ' + JSON.stringify(clean(t.errors)).slice(0, 600));
await t.close();
