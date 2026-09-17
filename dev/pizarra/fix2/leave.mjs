// Pizarra — cuánto tarda en salir (inicio) justo cuando se está codificando un guardado, con el
// hilo principal ocupado. Uso: node pizarra/fix2/leave.mjs [tablet]
import { open, board, wave, stroke, ready, inked } from '../fix1/h.mjs';

const size = process.argv[2] || 'tablet';
const t = await open(size);
if (process.env.ALT) { await t.page.goto(process.env.ALT + '#pizarra'); await ready(t.page); }
const { page } = t;
// SLOW=1: escritura lenta (como un disco o un celular lentos) para ver si el router la espera.
if (process.env.SLOW) await page.evaluate(() => { const s = CL.db.works.save.bind(CL.db.works); CL.db.works.save = async (w) => { await CL.util.sleep(1500); return s(w); }; });
const pointer = t.size.touch ? 'touch' : 'mouse';
const runs = [];
for (let r = 0; r < 4; r++) {
  const b = await board(page);
  await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool(['fibra', 'aerosol', 'crayon', 'pincel'][Math.floor(Math.random() * 4)]); T.selectSize(3); });
  for (let i = 0; i < 3; i++) await stroke(page, wave(b, 0.2 + i * 0.25, 0.05, 0.95, 0.07, 14), { pointer, steps: 10, delay: 0 });
  await page.waitForTimeout(330 + r * 60); // el autoguardado ya arrancó a codificar
  const before = await inked(page);
  const ms = await page.evaluate(async () => {
    const t0 = performance.now();
    CL.router.go('inicio');
    while (!document.querySelector('.screen--inicio') || document.querySelector('.screen--pizarra')) await new Promise((res) => setTimeout(res, 2));
    return Math.round(performance.now() - t0);
  });
  const t1 = Date.now();
  await page.evaluate(() => CL.router.go('pizarra')); await ready(page);
  runs.push({ leaveMs: ms, reopenMs: Date.now() - t1, before, after: await inked(page) });
}
console.log(JSON.stringify({ size, runs, errors: t.errors }, null, 1));
await t.close();
