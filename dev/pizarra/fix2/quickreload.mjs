// Pizarra — trazo y recarga a los N ms (¿se pierde?). ALT=<url de index.html> prueba otra copia de la app.
import { open, board, wave, stroke, ready, inked } from '../fix1/h.mjs';
const size = process.argv[2] || 'tablet';
const t = await open(size);
const { page } = t;
if (process.env.ALT) { await page.goto(process.env.ALT + '#pizarra'); await ready(page); }
const pointer = t.size.touch ? 'touch' : 'mouse';
const res = [];
for (const ms of [0, 100, 200, 300, 350, 450]) {
  const b = await board(page);
  await stroke(page, wave(b, 0.2 + Math.random() * 0.6), { pointer, steps: 14 });
  await page.waitForTimeout(ms);
  const before = await inked(page);
  await page.reload(); await ready(page);
  res.push({ ms, before, after: await inked(page) });
}
console.log(JSON.stringify({ size, res: res.map((r) => r.ms + ':' + (r.after >= r.before ? 'ok' : 'PERDIDO')), errors: t.errors }));
await t.close();
