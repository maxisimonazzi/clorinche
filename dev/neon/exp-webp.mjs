// Experimento: tamaño/tiempo PNG vs WebP de la capa de trazos recortada, y cuánto cambia al decodificar.
import { launch, appUrl, multiStroke, rect, saveDataUrl, SHOTS } from '../lib.mjs';
import path from 'node:path';
const t = await launch({ size: 'tablet' });
const { page } = t;
await page.goto(appUrl('neon'));
await page.waitForFunction(() => CL.neon && CL.neon.debug && CL.neon.debug.ready);
const r = await rect(page, '.neon-stage');
for (let k = 0; k < 6; k++) {
  await page.locator('.neon-swatch').nth(k).click();
  const pts = []; for (let i = 0; i <= 30; i++) pts.push([r.x + r.width * (0.1 + 0.8 * i / 30), r.y + r.height * (0.15 + k * 0.13 + 0.05 * Math.sin(i / 2))]);
  await multiStroke(page, [pts], { steps: 30, delay: 4 });
}
await page.waitForTimeout(300);
const res = await page.evaluate(async () => {
  const c = document.querySelector('.neon-paint:not(.neon-ghost)');
  const out = { size: c.width };
  const k = CL.util.canvas(c.width, c.height); k.getContext('2d').drawImage(c, 0, 0);
  const orig = k.getContext('2d').getImageData(0, 0, k.width, k.height).data;
  const diff = async (b) => { const img = await CL.util.blobToImage(b); const z = CL.util.canvas(k.width, k.height); const g = z.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, k.width, k.height).data; let mx = 0, sum = 0, n = 0; for (let i = 0; i < d.length; i += 4) { if (orig[i + 3] < 8) continue; for (let j = 0; j < 4; j++) { const e = Math.abs(d[i + j] - orig[i + j]); sum += e; if (e > mx) mx = e; } n++; } return { mx, avg: +(sum / n / 4).toFixed(2) }; };
  for (const [ty, q] of [['image/png'], ['image/webp', 0.92], ['image/webp', 0.97], ['image/webp', 1]]) {
    const t0 = performance.now(); const b = await CL.util.canvasToBlob(k, ty, q); const ms = Math.round(performance.now() - t0);
    out[ty + (q || '')] = { kb: Math.round(b.size / 1024), ms, type: b.type, err: await diff(b) };
  }
  const t0 = performance.now(); const u = k.toDataURL('image/webp', 0.92); out.syncWebp = Math.round(performance.now() - t0);
  return out;
});
console.log(JSON.stringify(res, null, 1), t.errors);
await t.close();
