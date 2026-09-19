// Corrección 1 — guardado en segundo plano al salir: (a) salir e ir y volver enseguida no parte la obra
// en dos; (b) salir y cerrar la pestaña enseguida no pierde el último trazo.
import { launch, appUrl, multiStroke, rect, SHOTS } from '../lib.mjs';
import path from 'node:path';
import fs from 'node:fs';

const size = process.argv[2] || 'tablet';
const prof = path.join(SHOTS, 'neon', 'fix', '_perfil-fondo-' + size);
const ready = (page) => page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
const inkOf = (page) => page.evaluate(() => {
  const c = document.querySelector('.neon-paint:not(.neon-ghost)');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let s = 0; for (let i = 3; i < d.length; i += 28) s += d[i];
  return Math.round(s / 1000);
});
const line = (r, fy) => { const p = []; for (let i = 0; i <= 30; i++) p.push([r.x + r.width * (0.1 + 0.8 * i / 30), r.y + r.height * (fy + 0.1 * Math.sin(i / 2))]); return p; };

// (a) neón -> pestaña pizarra -> neón, todo rápido
fs.rmSync(prof, { recursive: true, force: true });
let t = await launch({ size, persistent: prof });
await t.page.goto(appUrl('neon'));
await ready(t.page);
let r = await rect(t.page, '.neon-stage');
await multiStroke(t.page, [line(r, 0.3)], { steps: 30, delay: 5 });
await t.page.waitForTimeout(2000);
await multiStroke(t.page, [line(r, 0.6)], { steps: 30, delay: 5 });
const before = await inkOf(t.page);
const t0 = Date.now();
await t.page.locator('.screen--neon .mode-tab').first().click();
await t.page.waitForFunction(() => document.body.dataset.screen === 'pizarra');
const salir = Date.now() - t0;
await t.page.evaluate(() => CL.router.go('neon'));
await ready(t.page);
const after = await inkOf(t.page);
const n = await t.page.evaluate(async () => (await CL.db.works.list({ kind: 'neon' })).length);
console.log(`(a) salir ${salir} ms; ir y volver: tinta ${before} -> ${after} ${after >= before * 0.98 ? 'OK' : 'PERDIDO'}; obras neón = ${n} ${n === 1 ? 'OK' : 'FALLA'}`);
console.log('errors', t.errors);
await t.close();

// (b) trazo -> inicio -> cerrar la pestaña enseguida
for (const w of [0, 50, 100, 150, 300, 700]) {
  fs.rmSync(prof, { recursive: true, force: true });
  t = await launch({ size, persistent: prof });
  await t.page.goto(appUrl('neon'));
  await ready(t.page);
  r = await rect(t.page, '.neon-stage');
  await multiStroke(t.page, [line(r, 0.3)], { steps: 30, delay: 5 });
  await t.page.waitForTimeout(2000);
  await multiStroke(t.page, [line(r, 0.6)], { steps: 30, delay: 5 });
  const b = await inkOf(t.page);
  await t.page.locator('.screen--neon .btn-home').click();
  await t.page.waitForFunction(() => document.body.dataset.screen === 'inicio');
  await t.page.waitForTimeout(w);
  await t.page.close({ runBeforeUnload: true });
  await new Promise((res) => setTimeout(res, 1500));
  await t.close();
  t = await launch({ size, persistent: prof });
  await t.page.goto(appUrl('neon'));
  await ready(t.page);
  const a = await inkOf(t.page);
  console.log(`(b) inicio y cerrar a los ${w} ms: tinta ${b} -> ${a} ${a >= b * 0.98 ? 'OK' : 'PERDIDO'}`);
  console.log('errors', t.errors);
  await t.close();
}
