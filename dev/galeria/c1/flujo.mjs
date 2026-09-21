// Revisión (rv): flujos completos entre galería y los módulos (Seguir, volver, ¡Terminé!, atrás).
// Uso: cd dev && node review-galeria/rv-flujo.mjs [tamaño=tablet]
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { launch, appUrl, shot, tap, stroke } from '../../lib.mjs';
import { ok, clean, state, center } from './r1-lib.mjs';

const size = process.argv[2] || 'tablet';
const BASE = path.join(os.tmpdir(), 'colorinche-rv-profile');
const PROF = BASE + '-c1-flujo-' + size;
fs.rmSync(PROF, { recursive: true, force: true });
fs.cpSync(BASE, PROF, { recursive: true });
const t = await launch({ size, persistent: PROF });
const { page } = t;
const OUT = 'galeria/c1';
await page.goto(appUrl('inicio'));
await page.waitForTimeout(900);
// Inicio → Mis obras con un toque en la tarjeta
{
  const [x, y] = await center(page, '.home-card--obras');
  await tap(page, x, y);
  await page.waitForTimeout(1400);
  ok((await state(page)).hash === '#obras', 'inicio → tarjeta Mis obras → #obras');
}
// 1) Pestaña "sin terminar" → gato (colorear) → Seguir → pintar → atrás → galería actualizada
{
  const [bx, by] = await center(page, '.gal-tab >> nth=1');
  await tap(page, bx, by);
  await page.waitForTimeout(800);
  const info = await page.evaluate(async () => {
    const l = await CL.db.works.list({ status: 'progress' });
    const g = l.find((w) => w.kind === 'colorear');
    return { id: g.id, upd: g.updatedAt, source: g.source };
  });
  const sel = `.gal-card[data-id="${info.id}"]`;
  const [x, y] = await center(page, sel);
  await tap(page, x, y);
  await page.waitForTimeout(900);
  const [gx, gy] = await center(page, '.gv-go');
  await tap(page, gx, gy);
  await page.waitForTimeout(2800);
  const s1 = await state(page);
  ok(s1.hash === `#colorear/${info.source}/${info.id}`, 'Seguir → ' + s1.hash);
  const bb = await page.locator('.cl-board').boundingBox();
  // pintar dos zonas con toques
  await tap(page, bb.x + bb.width * 0.5, bb.y + bb.height * 0.75);
  await page.waitForTimeout(300);
  await tap(page, bb.x + bb.width * 0.3, bb.y + bb.height * 0.85);
  await page.waitForTimeout(400);
  await page.evaluate(() => history.back());
  await page.waitForTimeout(2200);
  const s2 = await state(page);
  const after = await page.evaluate(async (id) => {
    const w = await CL.db.works.get(id);
    const first = document.querySelector('.gal-card')?.dataset.id;
    return { upd: w.updatedAt, status: w.status, first, tab: document.querySelector('.gal-tab.active')?.getAttribute('aria-label') };
  }, info.id);
  await shot(page, `${OUT}/flujo-${size}-volver-de-colorear`);
  ok(s2.hash === '#obras' && after.upd > info.upd && after.first === info.id, `atrás desde colorear → galería con la obra actualizada primera (${JSON.stringify({ hash: s2.hash, ...after })})`);
  ok(after.tab === 'Terminadas' || after.tab === 'Sin terminar', 'pestaña al volver: ' + after.tab + ' (se perdió la pestaña elegida si dice Terminadas)');
}
// 2) Abrir una obra terminada de colorear, Seguir, "¡Terminé!" → #obras/<id>; atrás → ?
{
  const [ax, ay] = await center(page, '.gal-tab >> nth=0');
  await tap(page, ax, ay);
  await page.waitForTimeout(700);
  const id = await page.evaluate(async () => (await CL.db.works.list({ status: 'done' })).find((w) => w.kind === 'colorear' && w.source === 'vaca').id);
  await page.locator(`.gal-card[data-id="${id}"]`).scrollIntoViewIfNeeded();
  const [x, y] = await center(page, `.gal-card[data-id="${id}"]`);
  await tap(page, x, y);
  await page.waitForTimeout(900);
  const [gx, gy] = await center(page, '.gv-go');
  await tap(page, gx, gy);
  await page.waitForTimeout(2800);
  const bb = await page.locator('.cl-board').boundingBox();
  await tap(page, bb.x + bb.width * 0.5, bb.y + bb.height * 0.5);
  await page.waitForTimeout(400);
  await page.locator('.cl-done').click();
  await page.waitForFunction(() => location.hash.startsWith('#obras/'), null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  const s = await state(page);
  const n = await page.evaluate(async () => (await CL.db.works.list()).length);
  ok(s.hash === '#obras/' + id, `¡Terminé! sobre obra abierta desde la galería → ${s.hash} (misma obra: ${s.hash === '#obras/' + id}; obras: ${n})`);
  await shot(page, `${OUT}/flujo-${size}-termine`);
  await page.evaluate(() => history.back());
  await page.waitForTimeout(2500);
  const s2 = await state(page);
  console.log('   atrás tras ¡Terminé! →', s2.hash);
  await shot(page, `${OUT}/flujo-${size}-termine-atras`);
  await page.evaluate(() => history.back());
  await page.waitForTimeout(2500);
  console.log('   otro atrás →', (await state(page)).hash);
}
ok(clean(t.errors).length === 0, 'sin errores ' + JSON.stringify(clean(t.errors)).slice(0, 400));
await t.close();
