// Dibujar una raya, borrarla toda con la goma y tocar "¡Terminé!": ¿se crea una obra en blanco?
import { open, S, board, at, stroke, inked, works, click } from './h.mjs';
const t = await open('tablet');
const { page } = t;
const b = await board(page);
await page.evaluate(() => { const c = CL.pizarra.current._test; c.selectTool('fibra'); c.selectSize(0); });
await stroke(page, [at(b, 0.3, 0.5), at(b, 0.7, 0.5)], { pointer: 'touch', steps: 10 });
await page.evaluate(() => { const c = CL.pizarra.current._test; c.selectTool('goma'); c.selectSize(3); });
await stroke(page, [at(b, 0.2, 0.5), at(b, 0.8, 0.5)], { pointer: 'touch', steps: 20 });
await page.waitForTimeout(300);
const ink = await inked(page);
await click(t, '.pz-done', 0);
await page.waitForTimeout(3500);
console.log(JSON.stringify({ inkBeforeDone: ink, hash: await page.evaluate(() => location.hash), works: await works(page), errors: t.errors }));
await S(page, 'erased-then-done');
await t.close();
