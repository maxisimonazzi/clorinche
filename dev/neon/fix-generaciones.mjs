// QA neón: ¿se degrada el dibujo al recargar y seguir varias veces? (WebP con pérdida + guardado a 2× en dpr 3)
import { launch, appUrl, shot, multiStroke, rect, SHOTS } from '../lib.mjs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const size = process.argv[2] || 'phone';
const GENS = +(process.argv[3] || 6);
const prof = path.join(SHOTS, 'neon', 'fix', '_perfil-gen-' + size);
fs.rmSync(prof, { recursive: true, force: true });
const t = await launch({ size, persistent: prof });
const { page } = t;
if (process.env.FORCE_PNG) await page.addInitScript(() => { const tb = HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob = function (cb, type, q) { return tb.call(this, cb, type === 'image/webp' ? 'image/png' : type, q); }; });
const dpr = t.size.dpr;
const ready = () => page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
await page.goto(appUrl('neon'));
await ready();
await page.locator('.neon-mirror').nth(0).click();
await page.locator('.neon-swatch').nth(1).click();
await page.locator('.neon-size').nth(0).click();
const r = await rect(page, '.neon-stage');
const p = [];
for (let i = 0; i <= 30; i++) p.push([r.x + r.width * (0.15 + 0.7 * i / 30), r.y + r.height * (0.3 + 0.08 * Math.sin(i / 3))]);
await multiStroke(page, [p], { steps: 30, delay: 5 });
await page.waitForTimeout(2500);
// Región a comparar (px del lienzo, alrededor del trazo)
const grab = () => page.evaluate(() => {
  const c = document.querySelector('.neon-paint:not(.neon-ghost)');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  return Array.from(d.filter((_, i) => i % 16 === 0 || i % 16 === 3)); // muestra R y A de 1 de cada 4 píxeles
});
const base = await grab();
const crop = async (name) => {
  const f = await shot(page, `neon/fix/generaciones/${size}${process.env.FORCE_PNG ? '-png' : ''}-${name}`);
  const [x, y] = p[12];
  execFileSync('node', ['neon/fix-crop.mjs', f, f.replace('.png', '-z.png'), String(Math.round((x - 40) * dpr)), String(Math.round((y - 25) * dpr)), String(80 * dpr), String(50 * dpr), String(Math.max(2, Math.round(9 / dpr)))]);
};
await crop('gen0');
const meta0 = await page.evaluate(async () => (await CL.db.works.list({ kind: 'neon' }))[0].meta);
console.log('meta', JSON.stringify(meta0));
for (let g = 1; g <= GENS; g++) {
  await page.reload();
  await ready();
  await page.waitForTimeout(200);
  // un puntito lejos, para forzar un guardado nuevo desde la imagen recargada
  await multiStroke(page, [[[r.x + r.width * (0.1 + g * 0.1), r.y + r.height * 0.85], [r.x + r.width * (0.1 + g * 0.1) + 2, r.y + r.height * 0.85]]], { steps: 2, delay: 5 });
  await page.waitForTimeout(2500);
  const now = await grab();
  // diferencia sólo en la zona del trazo original (filas superiores): comparamos toda la muestra excepto donde cambió por los puntitos
  let sum = 0, max = 0, n = 0;
  const half = Math.floor(now.length * 0.6); // la mitad de arriba (el trazo está a 0.3 de alto)
  for (let i = 0; i < half; i++) { const d = Math.abs(now[i] - base[i]); sum += d; if (d > max) max = d; n++; }
  console.log(`generación ${g}: dif media ${(sum / n).toFixed(3)}  máx ${max}`);
  if (g === GENS) await crop('gen' + g);
}
console.log('errors', t.errors);
await t.close();
