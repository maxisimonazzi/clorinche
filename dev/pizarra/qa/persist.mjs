// ¿Se pierde lo último que se dibujó si se recarga / cierra enseguida? Y salir en medio de un trazo.
import { open, S, board, at, wave, stroke, multiStroke, info, inked, works, ready, appUrl } from './h.mjs';
import { touches } from '../../lib.mjs';

const size = process.argv[2] || 'tablet';
const t = await open(size);
const { page } = t;
const out = { size };
const b = await board(page);
const ptr = t.size.touch ? 'touch' : 'mouse';
await page.evaluate(() => { CL.pizarra.current._test.selectTool('fibra'); CL.pizarra.current._test.selectSize(3); });

// A) trazo 1, esperar a que se guarde; trazo 2 y recargar YA (200 ms después)
await stroke(page, wave(b, 0.3), { pointer: ptr, steps: 30 });
await page.waitForTimeout(2500);
out.inkA = await inked(page);
await stroke(page, wave(b, 0.6), { pointer: ptr, steps: 30 });
out.inkAB = await inked(page);
await page.waitForTimeout(200);
await page.reload();
await ready(page);
out.inkAfterFastReload = await inked(page);
out.lostSecondStroke = out.inkAfterFastReload < out.inkAB * 0.8;
await S(page, `persist/${size}-A-after-fast-reload`);

// B) lo mismo pero cerrando la pestaña a los 1000 ms (debounce ya disparado, codificando)
await stroke(page, wave(b, 0.8), { pointer: ptr, steps: 30 });
out.inkB0 = await inked(page);
await page.waitForTimeout(1000);
await page.reload();
await ready(page);
out.inkAfterReload1000 = await inked(page);

// C) salir a inicio en medio de un trazo (dedo apoyado) y volver
const b2 = await board(page);
if (t.size.touch) {
  await multiStroke(page, [wave(b2, 0.15, 0.1, 0.6)], { steps: 20, delay: 10, release: false });
} else {
  await stroke(page, wave(b2, 0.15, 0.1, 0.6), { steps: 20, release: false });
}
out.inkMid = await inked(page);
await page.evaluate(() => CL.router.go('inicio'));
await page.waitForTimeout(600);
if (t.size.touch) await touches(page, []);
else await page.mouse.up();
await page.evaluate(() => CL.router.go('pizarra'));
await ready(page);
out.inkBackIn = await inked(page);
out.works = await works(page);
await S(page, `persist/${size}-C-back-in`);
out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
