// QA pizarra: obras vacías (goma que borra todo; borrar todo sobre una obra terminada).
import { open, S, board, at, stroke, info, works, ready } from './h.mjs';

const t = await open('desktop');
const { page } = t;
const out = {};
const thumbInk = (id) => page.evaluate(async (id) => {
  const w = await CL.db.works.get(id);
  const img = await CL.util.blobToImage(w.paint);
  const c = CL.util.canvas(img.width, img.height); const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n;
}, id);
let b = await board(page);
// 1) un trazo chico y la goma gruesa lo borra entero
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('fibra'); T.selectColor('#ff3b30'); T.selectSize(1); });
await stroke(page, [at(b, 0.4, 0.5), at(b, 0.6, 0.5)], { steps: 10 });
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('goma'); T.selectSize(3); });
await stroke(page, [at(b, 0.35, 0.5), at(b, 0.65, 0.5)], { steps: 20 });
await page.waitForTimeout(300);
out.afterErase = { info: await info(page), layerInk: await page.evaluate(() => { const c = CL.pizarra.current._test.layer; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; }) };
await page.click('.pz-done');
await page.waitForTimeout(3500);
out.doneOnBlank = { hash: await page.evaluate(() => location.hash), works: await works(page) };
if (out.doneOnBlank.works[0]) out.doneOnBlank.savedInk = await thumbInk(out.doneOnBlank.works[0].id);
await S(page, 'q/empty/done-on-erased-board');
// 2) obra terminada con dibujo -> abrir desde la galería -> borrar todo -> salir
await page.evaluate(() => CL.router.go('pizarra')); await ready(page);
b = await board(page);
await page.evaluate(() => { const T = CL.pizarra.current._test; T.selectTool('crayon'); T.selectColor('#2f5bea'); T.selectSize(3); });
await stroke(page, [at(b, 0.2, 0.5), at(b, 0.8, 0.5)], { steps: 16 });
await page.click('.pz-done');
await page.waitForFunction(() => location.hash.startsWith('#obras/'), null, { timeout: 12000 });
await page.waitForTimeout(800);
const id = (await page.evaluate(() => location.hash)).split('/')[1];
await page.evaluate((id) => CL.router.go('pizarra/' + id), id); await ready(page);
await page.evaluate(() => { const T = CL.pizarra.current._test; T.wipeMs = 60; T.wipe(); });
await page.waitForTimeout(400);
await page.evaluate(() => CL.router.go('obras')); await page.waitForTimeout(1500);
out.wipedDone = { work: (await works(page)).find((w) => w.id === id), ink: await thumbInk(id) };
await S(page, 'q/empty/obras-after-wiping-done-work');
out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
