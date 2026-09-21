// Revisión (rv): descarga PNG de cada tipo de obra real (incluida una imagen subida) y validación del archivo.
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { launch, appUrl, SHOTS } from '../../lib.mjs';
import { ok, clean } from './r1-lib.mjs';
const BASE = path.join(os.tmpdir(), 'colorinche-rv-profile');
const PROF = BASE + '-c1-descarga';
fs.rmSync(PROF, { recursive: true, force: true });
fs.cpSync(BASE, PROF, { recursive: true });
const t = await launch({ size: 'tablet', persistent: PROF });
const { page } = t;
await page.goto(appUrl('obras'));
await page.waitForTimeout(1500);
const ids = await page.evaluate(async () => {
  const l = await CL.db.works.list();
  const f = (p) => (l.find(p) || {}).id;
  return { vaca: f((w) => w.source === 'vaca' && w.w === 2048), subida: f((w) => /^u-/.test(w.source)), pizarra: f((w) => w.kind === 'pizarra' && w.status === 'done'), neon: f((w) => w.kind === 'neon' && w.status === 'done'), pizarraProg: f((w) => w.kind === 'pizarra' && w.status === 'progress') };
});
for (const [nm, id] of Object.entries(ids)) {
  if (nm === 'pizarraProg') { await page.locator('.gal-tab').nth(1).click(); await page.waitForTimeout(700); }
  await page.locator(`.gal-card[data-id="${id}"]`).scrollIntoViewIfNeeded();
  await page.locator(`.gal-card[data-id="${id}"]`).click();
  await page.waitForTimeout(900);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.locator('.gv-down').click()]);
  const file = path.join(SHOTS, 'galeria/c1', 'descarga-' + nm + '.png');
  await dl.saveAs(file);
  const buf = fs.readFileSync(file);
  const sig = buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  const W = buf.readUInt32BE(16), H = buf.readUInt32BE(20);
  ok(sig && W > 400 && H > 400, `${nm}: ${dl.suggestedFilename()} PNG=${sig} ${W}x${H} ${Math.round(buf.length / 1024)} KB`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}
ok(clean(t.errors).length === 0, 'sin errores ' + JSON.stringify(clean(t.errors)).slice(0, 300));
await t.close();
