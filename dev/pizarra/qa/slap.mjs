// Manotazo: 10 dedos a la vez con crayón (¿cuántos lienzos de tamaño completo quedan en memoria?).
import { open, S, board, wave, multiStroke, info } from './h.mjs';
const size = process.argv[2] || 'tablet';
const t = await open(size);
const { page } = t;
const b = await board(page);
await page.evaluate(() => { const c = CL.pizarra.current._test; c.selectTool('crayon'); c.selectSize(2); c.selectColor('multi'); });
const paths = [];
for (let i = 0; i < 10; i++) paths.push(wave(b, 0.06 + i * 0.095, 0.1 + (i % 3) * 0.05, 0.6 + (i % 4) * 0.1, 0.03, 6));
const t0 = Date.now();
await multiStroke(page, paths, { steps: 20, delay: 10 });
const ms = Date.now() - t0;
await page.waitForTimeout(400);
const r = await page.evaluate(() => ({ live: document.querySelectorAll('.pz-live').length, doc: CL.pizarra.current.doc }));
r.MB = Math.round(r.doc.pw * r.doc.ph * 4 / 1048576 * (4 + r.live * 2));
await S(page, `slap-${size}`);
console.log(size, JSON.stringify({ ...r, ms, info: (await info(page)).undo, errors: t.errors }));
await t.close();
