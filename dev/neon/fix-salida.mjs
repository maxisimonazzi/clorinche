// QA neón: cerrar la pestaña por el camino normal (con pagehide) y demora al salir con "inicio" tras un trazo.
import { launch, appUrl, multiStroke, rect, SHOTS } from '../lib.mjs';
import path from 'node:path';
import fs from 'node:fs';

const size = process.argv[2] || 'tablet';
const prof = path.join(SHOTS, 'neon', 'fix', '_perfil-salida-' + size);
async function open() {
  const t = await launch({ size, persistent: prof });
  await t.page.goto(appUrl('neon'));
  await t.page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
  await t.page.waitForTimeout(300);
  return t;
}
const inkOf = (page) => page.evaluate(() => {
  const c = document.querySelector('.neon-paint:not(.neon-ghost)');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let s = 0; for (let i = 3; i < d.length; i += 28) s += d[i];
  return Math.round(s / 1000);
});
const line = (r, fy) => { const p = []; for (let i = 0; i <= 30; i++) p.push([r.x + r.width * (0.1 + 0.8 * i / 30), r.y + r.height * (fy + 0.1 * Math.sin(i / 2))]); return p; };

for (const w of [0, 50, 300]) {
  fs.rmSync(prof, { recursive: true, force: true });
  let t = await open();
  const r = await rect(t.page, '.neon-stage');
  await multiStroke(t.page, [line(r, 0.3)], { steps: 30, delay: 5 });
  await t.page.waitForTimeout(2500);
  await multiStroke(t.page, [line(r, 0.6)], { steps: 30, delay: 5 });
  await t.page.waitForTimeout(w);
  const before = await inkOf(t.page);
  await t.page.close({ runBeforeUnload: true });
  await new Promise((res) => setTimeout(res, 300));
  await t.close();
  t = await open();
  const after = await inkOf(t.page);
  console.log(`cerrar pestaña (pagehide) a los ${w} ms: tinta antes ${before} después ${after} ${after >= before * 0.98 ? 'OK' : 'PERDIDO'}`);
  await t.close();
}

// Demora al tocar "inicio" enseguida después de un trazo (el router espera el guardado).
fs.rmSync(prof, { recursive: true, force: true });
const t = await open();
const r = await rect(t.page, '.neon-stage');
for (let k = 0; k < 4; k++) {
  await multiStroke(t.page, [line(r, 0.2 + k * 0.18)], { steps: 30, delay: 5 });
  const t0 = Date.now();
  await t.page.locator('.screen--neon .btn-home').click();
  await t.page.waitForFunction(() => document.body.dataset.screen === 'inicio');
  console.log('demora inicio tras trazo', k + 1, Date.now() - t0, 'ms');
  await t.page.goto(appUrl('neon'));
  await t.page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
  await t.page.waitForTimeout(300);
}
console.log('errors', t.errors);
await t.close();
