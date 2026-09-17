// Terminé → festejo → galería; abrir la obra desde la galería, seguir dibujando; borrar todo en una obra terminada.
import { open, S, board, at, wave, stroke, info, inked, works, ready, click } from './h.mjs';

const size = process.argv[2] || 'tablet';
const t = await open(size);
const { page } = t;
const out = { size };
const ptr = t.size.touch ? 'touch' : 'mouse';
let b = await board(page);
await page.evaluate(() => { CL.pizarra.current._test.selectTool('arcoiris'); CL.pizarra.current._test.selectSize(3); });
await stroke(page, wave(b, 0.4), { pointer: ptr, steps: 30 });
await page.evaluate(() => CL.pizarra.current._test.selectTool('sellos'));
await stroke(page, [at(b, 0.5, 0.7), at(b, 0.5, 0.7)], { pointer: ptr, steps: 1 });
await page.waitForTimeout(500);
await click(t, '.pz-done', 0);
await page.waitForTimeout(600);
await S(page, `gallery/${size}-1-celebrate`);
await page.waitForFunction(() => location.hash.startsWith('#obras'), null, { timeout: 12000 });
await page.waitForTimeout(1200);
await S(page, `gallery/${size}-2-obras`);
out.works = await works(page);
const id = out.works[0].id;
// Abrir desde la galería (la ruta que usa la galería)
await page.evaluate((id) => CL.router.go('pizarra/' + id), id);
await ready(page);
out.opened = await info(page);
out.inkOpened = await inked(page);
b = await board(page);
await page.evaluate(() => { CL.pizarra.current._test.selectTool('fibra'); CL.pizarra.current._test.selectColor('#1fb35a'); });
await stroke(page, wave(b, 0.2), { pointer: ptr, steps: 20 });
await page.waitForTimeout(1500);
await S(page, `gallery/${size}-3-reopened-drawn`);
// Borrar todo en la obra terminada y salir
await page.evaluate(() => CL.pizarra.current._test.wipe());
await page.waitForTimeout(1300);
const tNav = Date.now();
await page.evaluate(() => CL.router.go('obras'));
await page.waitForFunction(() => document.body.dataset.screen === 'obras', null, { timeout: 15000 });
out.navDelayMs = Date.now() - tNav;
await page.waitForTimeout(1200);
out.afterWipeWorks = await works(page);
out.afterWipeBlank = await page.evaluate(async (id) => {
  const w = await CL.db.works.get(id);
  const img = await CL.util.blobToImage(w.paint);
  const c = CL.util.canvas(img.width, img.height); const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 8) n++;
  return { status: w.status, inkedPx: n };
}, id);
await S(page, `gallery/${size}-4-obras-after-wipe`);
out.errors = t.errors;
console.log(JSON.stringify(out, null, 1));
await t.close();
